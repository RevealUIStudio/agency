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
    return new Response(JSON.stringify({ calendars: {} }), { status: 200 });
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
