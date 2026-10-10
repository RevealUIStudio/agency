/**
 * @vitest-environment node
 */
import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  type ConsultationEnv,
  consultationEnvFromProcess,
  createGoogleCalendar,
} from '../consultation-calendar';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SERVICE_EMAIL = 'sa@example.com';
const SUBJECT = 'founder@revealui.com';

const credential = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
}).privateKey;

function decodePayload(assertion: string): Record<string, unknown> {
  const part = assertion.split('.')[1] ?? '';
  const padded = part
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(part.length / 4) * 4, '=');
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, unknown>;
}

async function captureToken(env: ConsultationEnv): Promise<URLSearchParams> {
  let body = '';
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url === TOKEN_URL) {
      body =
        init?.body instanceof URLSearchParams ? init.body.toString() : String(init?.body ?? '');
      return new Response(
        JSON.stringify({ access_token: `tok-${body.length}`, expires_in: 3600 }),
        {
          status: 200,
        },
      );
    }
    return new Response(JSON.stringify({ calendars: { [env.calendarId ?? '']: { busy: [] } } }), {
      status: 200,
    });
  };
  const calendar = createGoogleCalendar(env, fetchImpl);
  await calendar.busy(
    new Date('2026-09-24T13:00:00.000Z'),
    new Date('2026-09-24T14:00:00.000Z'),
    new Date('2026-09-24T12:00:00.000Z'),
  );
  if (!body) throw new Error('token-not-called');
  return new URLSearchParams(body);
}

describe('service-account impersonation', () => {
  it('reads GOOGLE_IMPERSONATE_SUBJECT and does not copy the calendar id', () => {
    const unset = consultationEnvFromProcess({
      GOOGLE_CALENDAR_ID: SUBJECT,
      GOOGLE_CLIENT_EMAIL: SERVICE_EMAIL,
      GOOGLE_PRIVATE_KEY: 'material',
    });
    expect(unset.googleImpersonateSubject).toBeUndefined();
    expect(unset.calendarId).toBe(SUBJECT);

    const set = consultationEnvFromProcess({
      GOOGLE_IMPERSONATE_SUBJECT: `  ${SUBJECT}  `,
    });
    expect(set.googleImpersonateSubject).toBe(SUBJECT);
  });

  it('omits JWT sub when GOOGLE_IMPERSONATE_SUBJECT is unset', async () => {
    const params = await captureToken({
      calendarId: SUBJECT,
      googleClientEmail: SERVICE_EMAIL,
      googleCredential: credential,
    });
    expect(params.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    const payload = decodePayload(params.get('assertion') ?? '');
    expect(payload.iss).toBe(SERVICE_EMAIL);
    expect(payload.scope).toBe('https://www.googleapis.com/auth/calendar');
    expect(payload).not.toHaveProperty('sub');
  });

  it('sets JWT sub from GOOGLE_IMPERSONATE_SUBJECT', async () => {
    const params = await captureToken({
      calendarId: SUBJECT,
      googleClientEmail: SERVICE_EMAIL,
      googleCredential: credential,
      googleImpersonateSubject: SUBJECT,
    });
    const payload = decodePayload(params.get('assertion') ?? '');
    expect(payload.sub).toBe(SUBJECT);
    expect(payload.iss).toBe(SERVICE_EMAIL);
  });

  it('uses the OAuth refresh grant when the trio is set', async () => {
    const params = await captureToken({
      calendarId: SUBJECT,
      oauthClientId: 'oauth-client',
      oauthClientSecret: 'oauth-secret',
      oauthRefreshToken: 'oauth-refresh',
      googleClientEmail: SERVICE_EMAIL,
      googleCredential: credential,
      googleImpersonateSubject: SUBJECT,
    });
    expect(params.get('grant_type')).toBe('refresh_token');
    expect(params.get('client_id')).toBe('oauth-client');
    expect(params.has('assertion')).toBe(false);
  });
});

describe('authoritative Calendar reads', () => {
  function calendar(payload: unknown | ((url: URL) => unknown)) {
    return createGoogleCalendar(
      {
        calendarId: SUBJECT,
        oauthClientId: 'read-client',
        oauthClientSecret: 'read-secret',
        oauthRefreshToken: 'read-refresh',
      },
      async (input) => {
        const url = new URL(String(input));
        const body =
          url.hostname === 'oauth2.googleapis.com'
            ? { access_token: 'read-test', expires_in: 3600 }
            : typeof payload === 'function'
              ? payload(url)
              : payload;
        return new Response(JSON.stringify(body));
      },
    );
  }

  const event = {
    id: 'event-read',
    extendedProperties: {
      private: {
        kind: 'studio-consultation',
        booking_id: 'booking-read',
        status: 'paid_scheduled',
        hours: '1',
      },
    },
  };

  it.each([
    null,
    {},
    { items: {} },
    { items: [null] },
    { items: [{}] },
    { items: [], nextPageToken: 42 },
  ])('rejects malformed list authority: %j', async (body) => {
    await expect(calendar(body).get('booking-read')).rejects.toThrow('calendar-list-integrity');
  });

  it('accepts a complete provider empty collection and cancelled bookings', async () => {
    expect(await calendar({ kind: 'calendar#events' }).get('booking-read')).toBeNull();
    expect(
      await calendar({ items: [{ id: 'cancelled', status: 'cancelled' }] }).get('booking-read'),
    ).toBeNull();
  });

  it('reads all pages before deciding a booking is absent', async () => {
    const adapter = calendar((url: URL) =>
      url.searchParams.has('pageToken')
        ? { items: [event] }
        : { items: [], nextPageToken: 'second' },
    );
    expect((await adapter.get('booking-read'))?.event_id).toBe(event.id);
  });

  it('rejects cyclic and truncated pagination instead of returning partial authority', async () => {
    await expect(
      calendar({ items: [], nextPageToken: 'repeat' }).get('booking-read'),
    ).rejects.toThrow('calendar-list-pagination');
    let page = 0;
    await expect(
      calendar(() => ({ items: [], nextPageToken: `page-${++page}` })).get('booking-read'),
    ).rejects.toThrow('calendar-list-pagination');
    expect(page).toBe(10);
  });

  it('rejects ambiguous or mismatched booking records', async () => {
    await expect(
      calendar({ items: [event, { ...event, id: 'another' }] }).get('booking-read'),
    ).rejects.toThrow('calendar-booking-ambiguous');
    await expect(
      calendar({ items: [{ id: 'other', extendedProperties: { private: {} } }] }).get(
        'booking-read',
      ),
    ).rejects.toThrow('calendar-booking-integrity');
  });

  it.each([
    {},
    { calendars: {} },
    { calendars: { [SUBJECT]: { errors: [{ reason: 'notFound' }] } } },
    { calendars: { [SUBJECT]: { busy: [], errors: [{ reason: 'internalError' }] } } },
    { calendars: { [SUBJECT]: { busy: [{ start: 'invalid', end: 'invalid' }] } } },
  ])('rejects unavailable free/busy authority: %j', async (body) => {
    await expect(
      calendar(body).busy(
        new Date('2026-10-08T14:00:00Z'),
        new Date('2026-10-08T15:00:00Z'),
        new Date('2026-10-08T12:00:00Z'),
      ),
    ).rejects.toThrow('calendar-busy-integrity');
  });
});
