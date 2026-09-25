import { describe, expect, it } from 'vitest';
import type { Booking, ConfirmationEmail } from '../../app/lib/consultation-booking';
import {
  DEFAULT_CONSULTATION_PRICE_ID,
  DEFAULT_STAGE_B_PRICE_ID,
} from '../../app/lib/consultation-checkout';
import { mintNetworkToken } from '../../app/lib/consultation-network-waive';
import type { OwnerPaidNotice } from '../../app/lib/consultation-owner';
import {
  type CalendarPort,
  type ConsultationEnv,
  createMemoryCalendar,
} from '../consultation-calendar';
import { type ConsultationDeps, handleConsultationRequest } from '../consultation-http';
import { type StripePort, stripeFromEnv, stripeSignatureHeader } from '../consultation-stripe';

const SECRET = 'whsec_test_consultation';
const NOW = new Date('2026-01-06T15:00:00.000Z');
const SLOT = {
  start: '2026-01-07T14:00:00.000Z',
  end: '2026-01-07T15:00:00.000Z',
};

function buyer(extra: Record<string, unknown> = {}) {
  return {
    ...SLOT,
    hours: 1,
    name: 'Ada Buyer',
    email: 'ada@example.com',
    company: 'Example Co',
    ...extra,
  };
}

function harness(
  seed: readonly Booking[] = [],
  envExtra: Partial<ConsultationEnv> = {},
  stripeOverride?: StripePort,
) {
  const calendar = createMemoryCalendar(seed);
  const checkouts: Array<{
    lines: readonly { price: string; quantity: number }[];
    successUrl: string;
    cancelUrl: string;
    stageBFee: string;
    networkJti: string | null;
    couponId?: string;
  }> = [];
  const emails: ConfirmationEmail[] = [];
  const owners: OwnerPaidNotice[] = [];
  let schedules = 0;
  let desk: string | null = null;
  let nextId = 1;
  const wrapped: CalendarPort = {
    expireHolds: (now) => calendar.expireHolds(now),
    busy: (from, to, now) => calendar.busy(from, to, now),
    putHold: (booking, now) => calendar.putHold(booking, now),
    release: (bookingId) => calendar.release(bookingId),
    get: (bookingId) => calendar.get(bookingId),
    schedulePaid: async (booking, sessionId) => {
      schedules += 1;
      const result = await calendar.schedulePaid(booking, sessionId);
      desk = result.desk;
      return result;
    },
  };
  const stripe: StripePort = stripeOverride ?? {
    async createCheckout(input) {
      checkouts.push({
        lines: input.lines,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        stageBFee: input.booking.stage_b_fee,
        networkJti: input.booking.network_jti,
        couponId: input.stageBNetworkCouponId,
      });
      return { id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' };
    },
  };
  const env: ConsultationEnv = {
    stripeSecretKey: 'sk_test_consultation',
    stripeWebhookSecret: SECRET,
    publicSiteUrl: 'https://revealuistudio.com',
    calendarId: 'founder',
    ...envExtra,
  };
  const deps: ConsultationDeps = {
    now: () => NOW,
    env,
    calendar: wrapped,
    stripe,
    bookingId: () => `book_${nextId++}`,
    onConfirmation: (email) => {
      emails.push(email);
    },
    onOwnerPaid: (notice) => {
      owners.push(notice);
    },
  };
  return {
    calendar,
    checkouts,
    emails,
    owners,
    deps,
    schedules: () => schedules,
    desk: () => desk,
  };
}

function stripePort(fetchImpl: typeof fetch): StripePort {
  const port = stripeFromEnv('sk_test_consultation', fetchImpl);
  if (!port) throw new Error('stripe');
  return port;
}

function request(path: string, body?: unknown, headers?: HeadersInit): Request {
  return new Request(`https://revealuistudio.com${path}`, {
    method: body === undefined && !path.includes('webhook') ? 'GET' : 'POST',
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('consultation http', () => {
  it('omits a busy slot and returns the next open hour', async () => {
    const paid: Booking = {
      booking_id: 'busy_1',
      ...SLOT,
      hours: 1,
      name: 'Busy',
      email: 'busy@example.com',
      company: null,
      stage_b: false,
      stage_b_fee: 'none',
      network_jti: null,
      status: 'paid_scheduled',
      expires_at: SLOT.start,
      event_id: 'evt_busy',
      meet_link: 'https://meet.google.com/lookup/busy_1',
      stripe_session_id: 'cs_busy',
    };
    const { deps } = harness([paid]);
    const response = await handleConsultationRequest(
      request('/api/consultation/availability?from=2026-01-07&to=2026-01-07&hours=1'),
      deps,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { slots: { start: string }[] };
    expect(body.slots.some((slot) => slot.start === SLOT.start)).toBe(false);
    expect(body.slots[0]?.start).toBe('2026-01-07T15:00:00.000Z');
  });

  it('holds a slot once and rejects the second save', async () => {
    const { deps, checkouts } = harness();
    const first = await handleConsultationRequest(request('/api/consultation/book', buyer()), deps);
    expect(first.status).toBe(200);
    const saved = (await first.json()) as { booking_id: string; checkout_url: string };
    expect(saved.booking_id).toBe('book_1');
    expect(saved.checkout_url).toBe('https://checkout.stripe.com/c/pay/cs_test_1');
    expect(checkouts[0]?.lines).toEqual([{ price: DEFAULT_CONSULTATION_PRICE_ID, quantity: 1 }]);
    expect(checkouts[0]?.successUrl).toBe(
      'https://revealuistudio.com/consultation/book/success?booking=book_1',
    );
    const second = await handleConsultationRequest(
      request('/api/consultation/book', buyer()),
      deps,
    );
    expect(second.status).toBe(409);
    expect(checkouts).toHaveLength(1);
  });

  it('charges Stage B when asked and ignores a waive field', async () => {
    const { deps, checkouts } = harness();
    const response = await handleConsultationRequest(
      request('/api/consultation/book', buyer({ stage_b: true, waive: true })),
      deps,
    );
    expect(response.status).toBe(200);
    expect(checkouts[0]?.lines).toEqual([
      { price: DEFAULT_CONSULTATION_PRICE_ID, quantity: 1 },
      { price: DEFAULT_STAGE_B_PRICE_ID, quantity: 1 },
    ]);
    expect(checkouts[0]?.stageBFee).toBe('paid_addon');
    expect(checkouts[0]?.networkJti).toBeNull();
    expect(checkouts[0]?.couponId).toBeUndefined();
  });

  it('ignores a forged fee and still omits the coupon', async () => {
    const forms: string[] = [];
    const fetchImpl: typeof fetch = async (_url, init) => {
      forms.push(String(init?.body ?? ''));
      return new Response(
        JSON.stringify({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };
    const { deps } = harness(
      [],
      {
        networkWaiveSecret: 'network-test-secret',
        stageBNetworkCouponId: 'stage_b_network_credit',
      },
      stripePort(fetchImpl),
    );
    const response = await handleConsultationRequest(
      request(
        '/api/consultation/book',
        buyer({
          stage_b: false,
          waive: true,
          stage_b_fee: 'waived_network',
        }),
      ),
      deps,
    );
    expect(response.status).toBe(200);
    const params = new URLSearchParams(forms[0]);
    expect(params.get('line_items[1][price]')).toBeNull();
    expect(params.get('metadata[stage_b]')).toBe('false');
    expect(params.get('metadata[stage_b_fee]')).toBe('none');
    expect([...params.keys()].some((key) => key.startsWith('discounts'))).toBe(false);
  });

  it('puts Stage B on the Session and applies the coupon for a signed token', async () => {
    const forms: string[] = [];
    const fetchImpl: typeof fetch = async (_url, init) => {
      forms.push(String(init?.body ?? ''));
      return new Response(
        JSON.stringify({ id: 'cs_net', url: 'https://checkout.stripe.com/c/pay/cs_net' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };
    const secret = 'network-test-secret';
    const { token } = await mintNetworkToken({
      secret,
      now: NOW,
      email: 'ada@example.com',
      jti: 'jti-http',
    });
    const { deps, calendar } = harness(
      [],
      {
        networkWaiveSecret: secret,
        stageBNetworkCouponId: 'stage_b_network_credit',
      },
      stripePort(fetchImpl),
    );
    const response = await handleConsultationRequest(
      request(
        '/api/consultation/book',
        buyer({ stage_b: false, waive: true, stage_b_fee: 'paid_addon', network_token: token }),
      ),
      deps,
    );
    expect(response.status).toBe(200);
    const params = new URLSearchParams(forms[0]);
    expect(params.get('line_items[0][price]')).toBe(DEFAULT_CONSULTATION_PRICE_ID);
    expect(params.get('line_items[0][quantity]')).toBe('1');
    expect(params.get('line_items[1][price]')).toBe(DEFAULT_STAGE_B_PRICE_ID);
    expect(params.get('line_items[1][quantity]')).toBe('1');
    expect(params.get('discounts[0][coupon]')).toBe('stage_b_network_credit');
    expect(params.get('metadata[stage_b]')).toBe('true');
    expect(params.get('metadata[stage_b_fee]')).toBe('waived_network');
    expect(params.get('metadata[network_jti]')).toBe('jti-http');
    const held = await calendar.get('book_1');
    expect(held?.stage_b).toBe(true);
    expect(held?.stage_b_fee).toBe('waived_network');
    expect(held?.network_jti).toBe('jti-http');
  });

  it('fails closed when the coupon env is missing on a signed token', async () => {
    const secret = 'network-test-secret';
    const { token } = await mintNetworkToken({ secret, now: NOW, jti: 'jti-missing' });
    const { deps, calendar, checkouts } = harness([], { networkWaiveSecret: secret });
    const response = await handleConsultationRequest(
      request('/api/consultation/book', buyer({ network_token: token })),
      deps,
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'network-coupon-unconfigured' });
    expect(checkouts).toHaveLength(0);
    expect(await calendar.get('book_1')).toBeNull();
  });

  it('rejects a tampered token and an email-bound token for another buyer', async () => {
    const secret = 'network-test-secret';
    const minted = await mintNetworkToken({
      secret,
      now: NOW,
      email: 'kayla@example.com',
      jti: 'jti-bound',
    });
    const tampered = `${minted.token.slice(0, -1)}${minted.token.endsWith('a') ? 'b' : 'a'}`;
    const { deps, calendar, checkouts } = harness([], {
      networkWaiveSecret: secret,
      stageBNetworkCouponId: 'stage_b_network_credit',
    });
    const bad = await handleConsultationRequest(
      request('/api/consultation/book', buyer({ network_token: tampered })),
      deps,
    );
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: 'network-token' });
    const mismatch = await handleConsultationRequest(
      request('/api/consultation/book', buyer({ network_token: minted.token })),
      deps,
    );
    expect(mismatch.status).toBe(400);
    expect(await mismatch.json()).toEqual({ error: 'network-email' });
    expect(checkouts).toHaveLength(0);
    expect(await calendar.get('book_1')).toBeNull();
  });

  it('mints a book link for the owner session and reports token status', async () => {
    const secret = 'network-test-secret';
    const { deps } = harness([], {
      ownerSession: 'owner-token',
      networkWaiveSecret: secret,
    });
    const guest = await handleConsultationRequest(
      request('/api/consultation/network-link', { role: 'owner', email: 'ada@example.com' }),
      deps,
    );
    expect(guest.status).toBe(403);
    const minted = await handleConsultationRequest(
      request(
        '/api/consultation/network-link',
        { email: 'Ada@Example.com', hours: 2, ttl_hours: 72 },
        { authorization: 'Bearer owner-token' },
      ),
      deps,
    );
    expect(minted.status).toBe(200);
    const body = (await minted.json()) as { url: string; expires_at: string };
    expect(body.expires_at).toBe('2026-01-09T15:00:00.000Z');
    const url = new URL(body.url);
    expect(url.pathname).toBe('/consultation/book');
    expect(url.searchParams.get('hours')).toBe('2');
    const token = url.searchParams.get('nw') ?? '';
    expect(token.length).toBeGreaterThan(20);
    const status = await handleConsultationRequest(
      request(`/api/consultation/network-status?nw=${encodeURIComponent(token)}`),
      deps,
    );
    expect(status.status).toBe(200);
    expect(await status.json()).toEqual({
      ok: true,
      expires_at: '2026-01-09T15:00:00.000Z',
      email_hint: 'a***@example.com',
    });
    const rejected = await handleConsultationRequest(
      request(`/api/consultation/network-status?nw=${encodeURIComponent(`${token}x`)}`),
      deps,
    );
    expect(await rejected.json()).toEqual({ ok: false });
  });

  it('schedules once, stores the Google Meet link, and notifies the founder once', async () => {
    const { deps, calendar, emails, owners, schedules, desk } = harness();
    const booked = await handleConsultationRequest(
      request('/api/consultation/book', buyer()),
      deps,
    );
    const saved = (await booked.json()) as { booking_id: string };
    const raw = JSON.stringify({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          payment_status: 'paid',
          amount_total: 30_000,
          metadata: {
            booking_id: saved.booking_id,
            start: SLOT.start,
            end: SLOT.end,
            hours: '1',
            stage_b: 'false',
            buyer_email: 'ada@example.com',
            buyer_name: 'Ada Buyer',
          },
        },
      },
    });
    const header = await stripeSignatureHeader(SECRET, raw, Math.floor(NOW.getTime() / 1000));
    const first = await handleConsultationRequest(
      request('/api/stripe/webhook', raw, { 'stripe-signature': header }),
      deps,
    );
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ received: true, status: 'paid_scheduled' });
    const paid = await calendar.get(saved.booking_id);
    expect(paid?.status).toBe('paid_scheduled');
    expect(paid?.meet_link).toBe('https://meet.google.com/lookup/book_1');
    expect(schedules()).toBe(1);
    expect(desk()).toBe('no-desk-writer');
    expect(emails).toHaveLength(1);
    expect(emails[0]?.subject).toBe(
      'RevealUI Studio Consultation, Wed, Jan 7 · 9:00 AM–10:00 AM ET',
    );
    expect(emails[0]?.text).toContain('Payment received');
    expect(emails[0]?.text).toContain('When: Wed, Jan 7 · 9:00 AM–10:00 AM ET');
    expect(emails[0]?.text).toContain('Company: Example Co');
    expect(emails[0]?.text).not.toContain('sheet writer');
    expect(emails[0]?.text).toContain('Google Meet:');
    expect(emails[0]?.text).not.toContain('The Meet link');
    expect(emails[0]?.subject).toContain('RevealUI Studio');
    expect(emails[0]?.text).toContain(paid?.meet_link);
    expect(owners).toHaveLength(1);
    expect(owners[0]?.to).toBe('founder@revealui.com');
    expect(owners[0]?.text).toContain('Buyer: Ada Buyer');
    expect(owners[0]?.text).toContain('Email: ada@example.com');
    expect(owners[0]?.text).toContain('When: Wed, Jan 7 · 9:00 AM–10:00 AM ET');
    expect(owners[0]?.text).toContain('Amount: $300');
    expect(owners[0]?.text).toContain(`Google Meet: ${paid?.meet_link}`);
    expect(owners[0]?.text).toContain(`Booking: ${saved.booking_id}`);
    expect(owners[0]?.text).toContain('Stage B: no');
    expect(owners[0]?.text).toContain('Network: no');
    expect(owners[0]?.text).not.toContain('\u2014');

    const view = await handleConsultationRequest(
      request(`/api/consultation/booking?booking=${saved.booking_id}`),
      deps,
    );
    expect(view.status).toBe(200);
    const visible = await view.json();
    expect(visible).toEqual({
      ok: true,
      start: SLOT.start,
      end: SLOT.end,
      meet_link: paid?.meet_link,
      stage_b: false,
    });
    const hidden = JSON.stringify(visible);
    expect(hidden).not.toContain('ada@example.com');
    expect(hidden).not.toContain('Ada Buyer');

    const second = await handleConsultationRequest(
      request('/api/stripe/webhook', raw, { 'stripe-signature': header }),
      deps,
    );
    expect(second.status).toBe(200);
    expect(schedules()).toBe(1);
    expect((await calendar.get(saved.booking_id))?.meet_link).toBe(paid?.meet_link);
    expect(emails).toHaveLength(1);
    expect(owners).toHaveLength(1);
  });

  it('rejects a bad signature and ignores an unpaid session', async () => {
    const { deps, calendar, schedules } = harness();
    const booked = await handleConsultationRequest(
      request('/api/consultation/book', buyer()),
      deps,
    );
    const saved = (await booked.json()) as { booking_id: string };
    const raw = JSON.stringify({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          payment_status: 'unpaid',
          metadata: { booking_id: saved.booking_id },
        },
      },
    });
    const bad = await handleConsultationRequest(
      request('/api/stripe/webhook', raw, { 'stripe-signature': 't=1,v1=deadbeef' }),
      deps,
    );
    expect(bad.status).toBe(400);
    const header = await stripeSignatureHeader(SECRET, raw, Math.floor(NOW.getTime() / 1000));
    const ignored = await handleConsultationRequest(
      request('/api/stripe/webhook', raw, { 'stripe-signature': header }),
      deps,
    );
    expect(ignored.status).toBe(200);
    expect(await ignored.json()).toEqual({ received: true, status: 'ignored' });
    expect((await calendar.get(saved.booking_id))?.status).toBe('slot_held');
    expect(schedules()).toBe(0);
  });

  it('sends the founder notice from the webhook when no sink is injected', async () => {
    const calls: Array<{ url: string; body: string }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const body = typeof init?.body === 'string' ? init.body : String(init?.body ?? '');
      calls.push({ url, body });
      if (url === 'https://oauth2.googleapis.com/token') {
        return new Response(JSON.stringify({ access_token: 'tok-owner', expires_in: 3600 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url.endsWith('/messages/send')) {
        return new Response(JSON.stringify({ id: 'msg_owner' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('no', { status: 404 });
    };
    const { deps, calendar } = harness([], {
      oauthClientId: 'owner-oauth',
      oauthClientSecret: 'owner-secret',
      oauthRefreshToken: 'owner-refresh',
    });
    const booked = await handleConsultationRequest(
      request('/api/consultation/book', buyer()),
      deps,
    );
    const saved = (await booked.json()) as { booking_id: string };
    const raw = JSON.stringify({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          payment_status: 'paid',
          amount_total: 30_000,
          metadata: { booking_id: saved.booking_id },
        },
      },
    });
    const header = await stripeSignatureHeader(SECRET, raw, Math.floor(NOW.getTime() / 1000));
    const response = await handleConsultationRequest(
      request('/api/stripe/webhook', raw, { 'stripe-signature': header }),
      { ...deps, onOwnerPaid: undefined, onConfirmation: undefined, fetchImpl },
    );
    expect(response.status).toBe(200);
    expect((await calendar.get(saved.booking_id))?.status).toBe('paid_scheduled');
    const send = calls.find((call) => call.url.endsWith('/messages/send'));
    expect(send?.url).toBe('https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
    const payload = JSON.parse(send?.body ?? '{}') as { raw?: string };
    const padded = (payload.raw ?? '').replaceAll('-', '+').replaceAll('_', '/');
    const message = Buffer.from(padded, 'base64').toString('utf8');
    expect(message).toContain('To: founder@revealui.com');
    expect(message).not.toContain('To: ada@example.com');
    expect(message).toContain('Subject: RevealUI Studio Consultation paid');
    expect(message).toContain('Buyer: Ada Buyer');
    expect(message).toContain('Email: ada@example.com');
    expect(message).toContain('When: Wed, Jan 7 · 9:00 AM–10:00 AM ET');
    expect(message).toContain('Amount: $300');
    expect(message).toContain('Google Meet: https://meet.google.com/lookup/book_1');
    expect(message).toContain(`Booking: ${saved.booking_id}`);
    expect(message).toContain('Stage B: no');
    expect(message).toContain('Network: no');
    expect(message).not.toContain('\u2014');
    expect(calls.some((call) => call.url.includes('api.resend.com'))).toBe(false);
  });
});
