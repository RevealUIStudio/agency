import { describe, expect, it } from 'vitest';
import { type CalendarPort, createMemoryCalendar } from '../consultation-calendar';
import { handleConsultationRequest } from '../consultation-http';
import {
  type ConsultationRateConfig,
  clientAddress,
  consultationRateConfigFromEnv,
  createConsultationThrottle,
} from '../consultation-rate-limit';

const BOOK = '/api/consultation/book';
const AVAILABILITY = '/api/consultation/availability';
const BOOKING = '/api/consultation/booking';
const NOW = new Date('2026-01-06T15:00:00.000Z');
const SLOT = {
  start: '2026-01-07T14:00:00.000Z',
  end: '2026-01-07T15:00:00.000Z',
};

function config(extra: Partial<ConsultationRateConfig> = {}): ConsultationRateConfig {
  return { ...consultationRateConfigFromEnv({}), ...extra };
}

function call(path: string, headers: Record<string, string> = {}): Request {
  return new Request(`https://revealuistudio.com${path}`, { headers });
}

describe('consultation rate limit', () => {
  it('allows requests under the limit', () => {
    const throttle = createConsultationThrottle(config({ bookPerMinute: 3 }));
    const request = call(BOOK, { 'x-real-ip': '203.0.113.10' });
    expect(throttle.consume(request, BOOK, 0)).toBeNull();
    expect(throttle.consume(request, BOOK, 1_000)).toBeNull();
    expect(throttle.consume(request, BOOK, 2_000)).toBeNull();
  });

  it('returns 429 with Retry-After when the window is full', async () => {
    const throttle = createConsultationThrottle(config({ bookPerMinute: 2, windowMs: 60_000 }));
    const request = call(BOOK, { 'x-real-ip': '203.0.113.10' });
    expect(throttle.consume(request, BOOK, 1_000)).toBeNull();
    expect(throttle.consume(request, BOOK, 2_000)).toBeNull();
    const denied = throttle.consume(request, BOOK, 2_500);
    expect(denied).not.toBeNull();
    expect(denied?.status).toBe(429);
    expect(denied?.headers.get('retry-after')).toBe('58');
    expect(denied?.headers.get('cache-control')).toContain('no-store');
    expect(await denied?.json()).toEqual({
      error: 'rate-limited',
      message: 'Too many requests. Please retry shortly.',
    });
  });

  it('resets the count when the window elapses', () => {
    const throttle = createConsultationThrottle(config({ bookPerMinute: 1, windowMs: 60_000 }));
    const request = call(BOOK, { 'x-real-ip': '203.0.113.10' });
    expect(throttle.consume(request, BOOK, 0)).toBeNull();
    expect(throttle.consume(request, BOOK, 1)?.status).toBe(429);
    expect(throttle.consume(request, BOOK, 60_000)).toBeNull();
  });

  it('counts each address on its own', () => {
    const throttle = createConsultationThrottle(config({ bookPerMinute: 1 }));
    const first = call(BOOK, { 'x-real-ip': '203.0.113.10' });
    const second = call(BOOK, { 'x-real-ip': '203.0.113.11' });
    expect(throttle.consume(first, BOOK, 0)).toBeNull();
    expect(throttle.consume(first, BOOK, 1)?.status).toBe(429);
    expect(throttle.consume(second, BOOK, 2)).toBeNull();
  });

  it('keeps the map at the cap and drops expired windows', () => {
    const throttle = createConsultationThrottle(
      config({ bookPerMinute: 5, maxKeys: 3, windowMs: 60_000 }),
    );
    for (let i = 1; i <= 20; i += 1) {
      const request = call(BOOK, { 'x-real-ip': `203.0.113.${i}` });
      throttle.consume(request, BOOK, 0);
      expect(throttle.keyCount()).toBeLessThanOrEqual(3);
    }
    expect(throttle.keyCount()).toBe(3);
    throttle.consume(call(BOOK, { 'x-real-ip': '198.51.100.20' }), BOOK, 60_000);
    expect(throttle.keyCount()).toBe(1);
  });

  it('applies the default caps for availability, booking, and lookup', () => {
    const throttle = createConsultationThrottle(consultationRateConfigFromEnv({}));
    const request = call(AVAILABILITY, { 'x-real-ip': '203.0.113.10' });
    for (let i = 0; i < 30; i += 1) {
      expect(throttle.consume(request, AVAILABILITY, i)).toBeNull();
    }
    expect(throttle.consume(request, AVAILABILITY, 30)?.status).toBe(429);
    for (let i = 0; i < 10; i += 1) {
      expect(throttle.consume(request, BOOK, i)).toBeNull();
    }
    expect(throttle.consume(request, BOOK, 10)?.status).toBe(429);
    for (let i = 0; i < 30; i += 1) {
      expect(throttle.consume(request, BOOKING, i)).toBeNull();
    }
    const denied = throttle.consume(request, BOOKING, 30);
    expect(denied?.status).toBe(429);
    expect(denied?.headers.get('retry-after')).toBe('60');
  });

  it('does not count the webhook or the owner route', () => {
    const throttle = createConsultationThrottle(config({ bookPerMinute: 1 }));
    const request = call('/api/stripe/webhook', { 'x-real-ip': '203.0.113.10' });
    expect(throttle.consume(request, '/api/stripe/webhook', 0)).toBeNull();
    expect(throttle.consume(request, '/api/consultation/network-link', 0)).toBeNull();
    expect(throttle.keyCount()).toBe(0);
  });

  it('keeps safe defaults when env is missing or out of range', () => {
    expect(consultationRateConfigFromEnv({})).toEqual({
      availabilityPerMinute: 30,
      bookPerMinute: 10,
      bookingPerMinute: 30,
      windowMs: 60_000,
      maxKeys: 4_096,
      availabilityCacheMs: 5_000,
    });
    const tuned = consultationRateConfigFromEnv({
      CONSULTATION_RATE_BOOK_PER_MIN: '4',
      CONSULTATION_RATE_AVAILABILITY_PER_MIN: '99999',
      CONSULTATION_RATE_BOOKING_PER_MIN: 'nope',
      CONSULTATION_RATE_WINDOW_MS: '0',
      CONSULTATION_RATE_MAX_KEYS: '2',
      CONSULTATION_AVAILABILITY_CACHE_MS: '',
    });
    expect(tuned.bookPerMinute).toBe(4);
    expect(tuned.availabilityPerMinute).toBe(30);
    expect(tuned.bookingPerMinute).toBe(30);
    expect(tuned.windowMs).toBe(60_000);
    expect(tuned.maxKeys).toBe(4_096);
    expect(tuned.availabilityCacheMs).toBe(5_000);
  });

  it('takes the first platform hop and does not key on a spoofed list', () => {
    const platform = call(BOOK, {
      'x-vercel-id': 'sfo1::edge',
      'x-vercel-forwarded-for': '203.0.113.10, 198.51.100.1',
      'x-forwarded-for': '192.0.2.50, 203.0.113.10',
    });
    expect(clientAddress(platform)).toBe('203.0.113.10');
    const forwardedOnly = call(BOOK, {
      'x-vercel-id': 'sfo1::edge',
      'x-forwarded-for': 'not-an-ip, 203.0.113.40, 198.51.100.2',
    });
    expect(clientAddress(forwardedOnly)).toBe('203.0.113.40');
    const appended = call(BOOK, { 'x-forwarded-for': '192.0.2.9, 203.0.113.41' });
    expect(clientAddress(appended)).toBe('203.0.113.41');
    expect(clientAddress(call(BOOK, { 'x-forwarded-for': '192.0.2.9' }))).toBe('unknown');
    expect(clientAddress(call(BOOK, { 'x-real-ip': '203.0.113.10, 198.51.100.1' }))).toBe(
      'unknown',
    );
    expect(clientAddress(call(BOOK, { 'x-real-ip': '::ffff:203.0.113.10' }))).toBe('203.0.113.10');
    expect(clientAddress(call(BOOK, { 'x-real-ip': '2001:DB8::1' }))).toBe('2001:db8::1');
    expect(clientAddress(call(BOOK, { 'x-real-ip': '[2001:db8::2]:443' }))).toBe('2001:db8::2');

    const throttle = createConsultationThrottle(config({ bookPerMinute: 1, maxKeys: 32 }));
    for (let i = 0; i < 15; i += 1) {
      const spoofed = call(BOOK, { 'x-forwarded-for': `spoof-${i}` });
      throttle.consume(spoofed, BOOK, 0);
    }
    expect(throttle.keyCount()).toBe(1);
    expect(throttle.consume(call(BOOK, { 'x-forwarded-for': 'spoof-99' }), BOOK, 1)?.status).toBe(
      429,
    );
  });

  it('coalesces identical availability loads and drops them after the ttl', async () => {
    const throttle = createConsultationThrottle(config({ availabilityCacheMs: 5_000, maxKeys: 4 }));
    let calls = 0;
    const load = async () => {
      calls += 1;
      return { slots: [calls] };
    };
    expect(await throttle.loadAvailability('1||', 0, load)).toEqual({ slots: [1] });
    expect(await throttle.loadAvailability('1||', 1_000, load)).toEqual({ slots: [1] });
    expect(calls).toBe(1);
    expect(await throttle.loadAvailability('1||', 5_000, load)).toEqual({ slots: [2] });
    expect(calls).toBe(2);
  });

  it('shares one in-flight availability load and does not cache a failure', async () => {
    const throttle = createConsultationThrottle(config({ availabilityCacheMs: 5_000 }));
    let calls = 0;
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = throttle.loadAvailability('k', 0, async () => {
      calls += 1;
      await gate;
      return { ok: true };
    });
    const second = throttle.loadAvailability('k', 0, async () => {
      calls += 1;
      return { ok: false };
    });
    release();
    expect(await first).toEqual({ ok: true });
    expect(await second).toEqual({ ok: true });
    expect(calls).toBe(1);

    await expect(
      throttle.loadAvailability('err', 0, async () => {
        throw new Error('calendar');
      }),
    ).rejects.toThrow('calendar');
    expect(await throttle.loadAvailability('err', 1, async () => ({ ok: true }))).toEqual({
      ok: true,
    });
  });

  it('caps cached availability keys', async () => {
    const throttle = createConsultationThrottle(config({ availabilityCacheMs: 5_000, maxKeys: 3 }));
    for (let i = 0; i < 10; i += 1) {
      await throttle.loadAvailability(`k${i}`, 0, async () => ({ i }));
    }
    expect(throttle.cacheCount()).toBeLessThanOrEqual(3);
    expect(throttle.cacheCount()).toBe(3);
  });
});

describe('consultation http throttle', () => {
  function port(onHold?: () => void): { calendar: CalendarPort; holds: () => number } {
    const calendar = createMemoryCalendar();
    let holds = 0;
    return {
      holds: () => holds,
      calendar: {
        expireHolds: (now) => {
          holds += 1;
          return calendar.expireHolds(now);
        },
        busy: (from, to, now) => calendar.busy(from, to, now),
        putHold: (booking, now) => {
          onHold?.();
          return calendar.putHold(booking, now);
        },
        release: (bookingId) => calendar.release(bookingId),
        get: (bookingId) => calendar.get(bookingId),
        recordRefund: (bookingId, stripeSessionId, evidence) =>
          calendar.recordRefund(bookingId, stripeSessionId, evidence),
        resolveDomainPackRefund: (bookingId, chargeId, amountRefunded, decision) =>
          calendar.resolveDomainPackRefund(bookingId, chargeId, amountRefunded, decision),
        schedulePaid: (booking, sessionId) => calendar.schedulePaid(booking, sessionId),
      },
    };
  }

  it('keeps the availability payload and skips a second calendar list', async () => {
    const { calendar, holds } = port();
    const deps = {
      now: () => NOW,
      env: { calendarId: 'calendar' },
      calendar,
      throttle: createConsultationThrottle(config({ availabilityCacheMs: 5_000 })),
    };
    const headers = { 'x-real-ip': '203.0.113.10' };
    const path = `${AVAILABILITY}?from=2026-01-07&to=2026-01-08&hours=1`;
    const first = await handleConsultationRequest(
      new Request(`https://revealuistudio.com${path}`, { headers }),
      deps,
    );
    const second = await handleConsultationRequest(
      new Request(`https://revealuistudio.com${path}`, { headers }),
      deps,
    );
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const body = (await first.json()) as { timezone: string; hours: number; slots: unknown[] };
    expect(body.timezone).toBe('America/New_York');
    expect(body.hours).toBe(1);
    expect(Array.isArray(body.slots)).toBe(true);
    expect(await second.json()).toEqual(body);
    expect(holds()).toBe(1);
    const other = await handleConsultationRequest(
      new Request(`https://revealuistudio.com${AVAILABILITY}?hours=2`, { headers }),
      deps,
    );
    expect(other.status).toBe(200);
    expect(holds()).toBe(2);
  });

  it('returns 429 for a second booking before another calendar write', async () => {
    let writes = 0;
    const { calendar } = port(() => {
      writes += 1;
    });
    const deps = {
      now: () => NOW,
      env: {
        stripeSecretKey: 'sk_test_consultation',
        publicSiteUrl: 'https://revealuistudio.com',
        calendarId: 'calendar',
      },
      calendar,
      stripe: {
        async createCheckout() {
          return { id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' };
        },
      },
      bookingId: () => 'book_rate_1',
      throttle: createConsultationThrottle(config({ bookPerMinute: 1 })),
    };
    const headers = { 'content-type': 'application/json', 'x-real-ip': '203.0.113.10' };
    const body = JSON.stringify({
      ...SLOT,
      hours: 1,
      name: 'Buyer Example',
      email: 'buyer@example.com',
    });
    const first = await handleConsultationRequest(
      new Request(`https://revealuistudio.com${BOOK}`, { method: 'POST', headers, body }),
      deps,
    );
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({
      booking_id: 'book_rate_1',
      checkout_url: 'https://checkout.stripe.com/c/pay/cs_test_1',
    });
    const second = await handleConsultationRequest(
      new Request(`https://revealuistudio.com${BOOK}`, { method: 'POST', headers, body }),
      deps,
    );
    expect(second.status).toBe(429);
    expect(Number(second.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(writes).toBe(1);
  });

  it('does not throttle signature checks or the owner route', async () => {
    const { calendar } = port();
    const deps = {
      now: () => NOW,
      env: {
        stripeWebhookSecret: 'whsec_test_consultation',
        ownerSession: 'owner-token',
        calendarId: 'calendar',
      },
      calendar,
      throttle: createConsultationThrottle(config({ bookPerMinute: 1, availabilityPerMinute: 1 })),
    };
    const headers = { 'content-type': 'application/json', 'x-real-ip': '203.0.113.10' };
    for (let i = 0; i < 4; i += 1) {
      const webhook = await handleConsultationRequest(
        new Request('https://revealuistudio.com/api/stripe/webhook', {
          method: 'POST',
          headers,
          body: '{}',
        }),
        deps,
      );
      expect(webhook.status).toBe(400);
      const owner = await handleConsultationRequest(
        new Request('https://revealuistudio.com/api/consultation/network-link', {
          method: 'POST',
          headers,
          body: '{}',
        }),
        deps,
      );
      expect(owner.status).toBe(403);
    }
  });
});
