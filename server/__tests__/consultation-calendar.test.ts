import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { GoogleCalendar, signServiceAccountJwt } from '../consultation-calendar';
import type { ConsultationBooking } from '../consultation-store';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

function booking(overrides?: Partial<ConsultationBooking>): ConsultationBooking {
  return {
    id: 'book_1',
    start: '2026-09-23T13:00:00.000Z',
    end: '2026-09-23T14:00:00.000Z',
    hours: 1,
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    company: 'Analytical Engines',
    stageB: false,
    status: 'slot_held',
    expiresAt: '2026-09-23T12:30:00.000Z',
    checkoutSessionId: 'cs_test_book',
    eventId: 'evt_hold',
    meetLink: null,
    createdAt: '2026-09-23T12:00:00.000Z',
    paidAt: null,
    ...overrides,
  };
}

describe('Google Calendar client', () => {
  it('signs a service-account token and can impersonate the founder calendar', () => {
    const jwt = signServiceAccountJwt({
      clientEmail: 'calendar-test@example.com',
      privateKey: pem,
      nowSec: 1_700_000_000,
      impersonate: 'calendar-owner@example.com',
    });
    const payload = jwt.split('.')[1] ?? '';
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      scope: string;
      sub?: string;
      iss: string;
    };
    expect(claims.iss).toBe('calendar-test@example.com');
    expect(claims.scope).toContain('calendar');
    expect(claims.sub).toBe('calendar-owner@example.com');
  });

  it('reads freebusy and confirms a guest Meet on the founder event once', async () => {
    const calls: Array<{ url: string; method: string; body?: string }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const body = typeof init?.body === 'string' ? init.body : undefined;
      calls.push({ url, method: init?.method ?? 'GET', body });
      if (url.includes('oauth2.googleapis.com')) {
        return Response.json({ access_token: 'ya29.test', expires_in: 3600 });
      }
      if (url.includes('freeBusy')) {
        return Response.json({
          calendars: {
            'founder-calendar': {
              busy: [{ start: '2026-09-23T14:00:00.000Z', end: '2026-09-23T15:00:00.000Z' }],
            },
          },
        });
      }
      if (url.includes('privateExtendedProperty=bookingId')) {
        return Response.json({ items: [] });
      }
      if (init?.method === 'PATCH') {
        return Response.json({
          id: 'evt_hold',
          hangoutLink: 'https://meet.google.com/abc-defg-hij',
        });
      }
      return Response.json({ items: [] });
    };
    const calendar = new GoogleCalendar({
      calendarId: 'founder-calendar',
      clientEmail: 'calendar-test@example.com',
      privateKey: pem,
      fetchImpl,
      now: () => new Date('2026-09-23T12:00:00.000Z'),
    });

    const busy = await calendar.busy(
      new Date('2026-09-23T12:00:00.000Z'),
      new Date('2026-09-24T12:00:00.000Z'),
    );
    expect(busy).toEqual([{ start: '2026-09-23T14:00:00.000Z', end: '2026-09-23T15:00:00.000Z' }]);
    const freeBusy = calls.find((call) => call.url.includes('freeBusy'));
    expect(freeBusy?.body).toContain('"timeZone":"America/New_York"');
    expect(freeBusy?.body).toContain('founder-calendar');

    const confirmed = await calendar.confirmPaid(booking());
    expect(confirmed).toEqual({
      eventId: 'evt_hold',
      meetLink: 'https://meet.google.com/abc-defg-hij',
      already: false,
    });
    const patch = calls.find((call) => call.method === 'PATCH');
    expect(patch?.url).toContain('conferenceDataVersion=1');
    expect(patch?.url).toContain('sendUpdates=all');
    const sent = JSON.parse(patch?.body ?? '{}') as {
      attendees: Array<{ email: string }>;
      conferenceData: {
        createRequest: { conferenceSolutionKey: { type: string }; requestId: string };
      };
      summary: string;
    };
    expect(sent.attendees).toEqual([{ email: 'ada@example.com' }]);
    expect(sent.conferenceData.createRequest.conferenceSolutionKey.type).toBe('hangoutsMeet');
    expect(sent.conferenceData.createRequest.requestId).toBe('book_1');
    expect(sent.summary).toBe('RevealUI Studio Consultation - Ada Lovelace');

    calls.length = 0;
    const fetchAgain: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, method: init?.method ?? 'GET' });
      if (url.includes('oauth2.googleapis.com')) {
        return Response.json({ access_token: 'ya29.test', expires_in: 3600 });
      }
      return Response.json({
        items: [
          {
            id: 'evt_hold',
            hangoutLink: 'https://meet.google.com/abc-defg-hij',
            extendedProperties: { private: { studioStatus: 'paid_scheduled' } },
          },
        ],
      });
    };
    const second = new GoogleCalendar({
      calendarId: 'founder-calendar',
      clientEmail: 'calendar-test@example.com',
      privateKey: pem,
      fetchImpl: fetchAgain,
      now: () => new Date('2026-09-23T12:05:00.000Z'),
    });
    const again = await second.confirmPaid(
      booking({ status: 'paid_scheduled', meetLink: 'https://meet.google.com/abc-defg-hij' }),
    );
    expect(again.already).toBe(true);
    expect(
      calls.some(
        (call) =>
          !call.url.includes('oauth2.googleapis.com') &&
          (call.method === 'PATCH' || call.method === 'POST'),
      ),
    ).toBe(false);
  });
});
