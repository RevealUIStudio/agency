import { describe, expect, it } from 'vitest';
import type { Booking, ConfirmationEmail } from '../../app/lib/consultation-booking';
import { NETWORK_LINK_USED } from '../../app/lib/consultation-buyer';
import {
  type CheckoutLine,
  consultationPriceDataLine,
  DEFAULT_STAGE_B_PRICE_ID,
  domainAddOnPriceDataLine,
} from '../../app/lib/consultation-checkout';
import { mintNetworkToken } from '../../app/lib/consultation-network-waive';
import type { OwnerPaidNotice } from '../../app/lib/consultation-owner';
import {
  type CalendarPort,
  type ConsultationEnv,
  createMemoryCalendar,
} from '../consultation-calendar';
import { type ConsultationDeps, handleConsultationRequest } from '../consultation-http';
import {
  consultationRateConfigFromEnv,
  createConsultationThrottle,
} from '../consultation-rate-limit';
import { type StripePort, stripeFromEnv, stripeSignatureHeader } from '../consultation-stripe';
import { createMemoryNetworkLedger } from '../network-redeem';

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
    lines: readonly CheckoutLine[];
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
    recordRefund: (bookingId, stripeSessionId, evidence) =>
      calendar.recordRefund(bookingId, stripeSessionId, evidence),
    resolveDomainPackRefund: (bookingId, chargeId, amountRefunded, decision) =>
      calendar.resolveDomainPackRefund(bookingId, chargeId, amountRefunded, decision),
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
  const networkLedger = createMemoryNetworkLedger();
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
    throttle: createConsultationThrottle(consultationRateConfigFromEnv({})),
    networkLedger,
  };
  return {
    calendar,
    networkLedger,
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
  it('keeps policy assessment owner-only and requires verified notice/history without mutating payment or calendar', async () => {
    const booking: Booking = {
      booking_id: 'book_changes',
      ...SLOT,
      hours: 1,
      name: 'Ada Buyer',
      email: 'ada@example.com',
      company: null,
      stage_b: false,
      stage_b_fee: 'none',
      network_jti: null,
      status: 'paid_scheduled',
      expires_at: SLOT.start,
      event_id: 'evt_changes',
      meet_link: 'https://meet.google.com/existing',
      stripe_session_id: 'cs_existing',
    };
    const h = harness([booking], { ownerSession: 'owner_test_session' });
    const body = {
      booking: booking.booking_id,
      noticeReceivedAt: '2026-01-06T14:00:00Z',
      noticeReference: 'inbox_message_1',
      historyVerified: true,
      cancelledBy: 'buyer',
      lateReschedulesUsed: 0,
      domainPackDelivery: 'not_purchased',
    };
    const guest = await handleConsultationRequest(
      request('/api/consultation/booking', body),
      h.deps,
    );
    expect(guest.status).toBe(403);
    const headers = { authorization: 'Bearer owner_test_session' };
    const missing = await handleConsultationRequest(
      request('/api/consultation/booking', { ...body, historyVerified: false }, headers),
      h.deps,
    );
    expect(missing.status).toBe(400);
    const result = await handleConsultationRequest(
      request('/api/consultation/booking', body, headers),
      h.deps,
    );
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({
      status: 'assessment',
      fulfilled: false,
      decision: { consultationRefund: 'full', freeReschedule: true, reason: 'at_least_24_hours' },
    });
    expect(await h.calendar.get(booking.booking_id)).toEqual(booking);
    expect(h.checkouts).toHaveLength(0);
    expect(h.emails).toHaveLength(0);
    expect(h.owners).toHaveLength(0);
  });
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
    expect(checkouts[0]?.lines).toEqual([consultationPriceDataLine(1)]);
    expect(checkouts[0]?.successUrl).toBe(
      'https://revealuistudio.com/consultation/book/success?booking=book_1&session_id={CHECKOUT_SESSION_ID}',
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
    expect(checkouts[0]?.lines).toEqual([consultationPriceDataLine(1), domainAddOnPriceDataLine()]);
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
    expect(params.get('line_items[0][price]')).toBeNull();
    expect(params.get('line_items[0][price_data][product_data][name]')).toBe('Consultation');
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
    const pending = await handleConsultationRequest(
      request(`/api/consultation/booking?booking=${saved.booking_id}&session_id=cs_test_1`),
      deps,
    );
    expect(await pending.json()).toEqual({ status: 'pending' });
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
    const confirmed = await handleConsultationRequest(
      request(`/api/consultation/booking?booking=${saved.booking_id}&session_id=cs_test_1`),
      deps,
    );
    expect(await confirmed.json()).toEqual({ status: 'confirmed', ...SLOT, stage_b: false });
    const wrongReference = await handleConsultationRequest(
      request(`/api/consultation/booking?booking=${saved.booking_id}&session_id=cs_wrong`),
      deps,
    );
    expect(wrongReference.status).toBe(404);
    const missingReference = await handleConsultationRequest(
      request('/api/consultation/booking'),
      deps,
    );
    expect(missingReference.status).toBe(400);
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
    expect(owners[0]?.text).toContain('Domain add-on: no');
    expect(owners[0]?.text).toContain('Network: no');
    expect(owners[0]?.text).not.toContain('\u2014');

    const view = await handleConsultationRequest(
      request(`/api/consultation/booking?booking=${saved.booking_id}&session_id=cs_test_1`),
      deps,
    );
    expect(view.status).toBe(200);
    const visible = await view.json();
    expect(visible).toEqual({
      status: 'confirmed',
      start: SLOT.start,
      end: SLOT.end,
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

  it('does not recreate an expired paid hold over a replacement booking', async () => {
    const { deps, calendar, emails } = harness();
    const first = await handleConsultationRequest(request('/api/consultation/book', buyer()), deps);
    const { booking_id: oldId } = (await first.json()) as { booking_id: string };
    const later = new Date(NOW.getTime() + 21 * 60_000);
    const laterDeps = { ...deps, now: () => later };
    await calendar.expireHolds(later);
    const second = await handleConsultationRequest(
      request('/api/consultation/book', buyer()),
      laterDeps,
    );
    expect(second.status).toBe(200);
    const { booking_id: newId } = (await second.json()) as { booking_id: string };
    async function pay(id: string) {
      const raw = JSON.stringify({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: `session-${id}`,
            payment_status: 'paid',
            metadata: {
              booking_id: id,
              ...SLOT,
              hours: '1',
              buyer_name: 'Ada',
              buyer_email: 'ada@example.com',
            },
          },
        },
      });
      const signature = await stripeSignatureHeader(
        SECRET,
        raw,
        Math.floor(later.getTime() / 1000),
      );
      return handleConsultationRequest(
        request('/api/stripe/webhook', raw, { 'stripe-signature': signature }),
        laterDeps,
      );
    }
    expect((await pay(newId)).status).toBe(200);
    const latePayment = await pay(oldId);
    expect(latePayment.status).toBe(409);
    expect(await latePayment.json()).toEqual({ error: 'booking-expired' });
    expect(await calendar.get(oldId)).toBeNull();
    expect((await calendar.get(newId))?.status).toBe('paid_scheduled');
    expect(emails).toHaveLength(1);
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
    expect(message).toContain('Domain add-on: no');
    expect(message).toContain('Network: no');
    expect(message).not.toContain('\u2014');
    expect(calls.some((call) => call.url.includes('api.resend.com'))).toBe(false);
  });

  it('accepts the first redemption and reuses the open session for the same email', async () => {
    const secret = 'network-test-secret';
    const { token } = await mintNetworkToken({
      secret,
      now: NOW,
      email: 'ada@example.com',
      jti: 'jti-first',
    });
    const { deps, checkouts, networkLedger } = harness([], {
      networkWaiveSecret: secret,
      stageBNetworkCouponId: 'stage_b_network_credit',
    });
    const first = await handleConsultationRequest(
      request('/api/consultation/book', buyer({ network_token: token })),
      deps,
    );
    expect(first.status).toBe(200);
    const saved = (await first.json()) as { booking_id: string; checkout_url: string };
    expect(saved.booking_id).toBe('book_1');
    expect(saved.checkout_url).toBe('https://checkout.stripe.com/c/pay/cs_test_1');
    expect(checkouts).toHaveLength(1);
    const claim = await networkLedger.get('jti-first');
    expect(claim?.status).toBe('open');
    expect(claim?.email).toBe('ada@example.com');
    expect(claim?.stripeSessionId).toBe('cs_test_1');
    expect(claim?.bookingId).toBe('book_1');
    expect(claim?.expiresAt).toBe(new Date(NOW.getTime() + 72 * 60 * 60 * 1000).toISOString());

    const again = await handleConsultationRequest(
      request('/api/consultation/book', buyer({ network_token: token })),
      deps,
    );
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual({
      booking_id: 'book_1',
      checkout_url: 'https://checkout.stripe.com/c/pay/cs_test_1',
    });
    expect(checkouts).toHaveLength(1);
  });

  it('rejects a second redemption', async () => {
    const secret = 'network-test-secret';
    const { token } = await mintNetworkToken({ secret, now: NOW, jti: 'jti-second' });
    const { deps, checkouts, networkLedger } = harness([], {
      networkWaiveSecret: secret,
      stageBNetworkCouponId: 'stage_b_network_credit',
    });
    const first = await handleConsultationRequest(
      request('/api/consultation/book', buyer({ network_token: token })),
      deps,
    );
    expect(first.status).toBe(200);
    const saved = (await first.json()) as { booking_id: string };

    const other = await handleConsultationRequest(
      request(
        '/api/consultation/book',
        buyer({ email: 'other@example.com', network_token: token }),
      ),
      deps,
    );
    expect(other.status).toBe(409);
    expect(await other.json()).toEqual({
      error: 'network-redeemed',
      message: NETWORK_LINK_USED,
    });
    expect(checkouts).toHaveLength(1);

    const raw = JSON.stringify({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          payment_status: 'paid',
          amount_total: 30_000,
          metadata: {
            booking_id: saved.booking_id,
            network_jti: 'jti-second',
            start: SLOT.start,
            end: SLOT.end,
            hours: '1',
            stage_b: 'true',
            stage_b_fee: 'waived_network',
            buyer_email: 'ada@example.com',
            buyer_name: 'Ada Buyer',
          },
        },
      },
    });
    const header = await stripeSignatureHeader(SECRET, raw, Math.floor(NOW.getTime() / 1000));
    const paid = await handleConsultationRequest(
      request('/api/stripe/webhook', raw, { 'stripe-signature': header }),
      deps,
    );
    expect(paid.status).toBe(200);
    expect((await networkLedger.get('jti-second'))?.status).toBe('paid');

    const replay = await handleConsultationRequest(
      request('/api/consultation/book', buyer({ network_token: token })),
      deps,
    );
    expect(replay.status).toBe(409);
    expect(await replay.json()).toEqual({
      error: 'network-redeemed',
      message: NETWORK_LINK_USED,
    });
    expect(checkouts).toHaveLength(1);
  });

  it('allows retry after a failed checkout', async () => {
    const secret = 'network-test-secret';
    const { token } = await mintNetworkToken({ secret, now: NOW, jti: 'jti-retry' });
    let fail = true;
    let calls = 0;
    const stripe: StripePort = {
      async createCheckout() {
        calls += 1;
        if (fail) throw new Error('stripe-down');
        return { id: 'cs_test_retry', url: 'https://checkout.stripe.com/c/pay/cs_test_retry' };
      },
    };
    const { deps, networkLedger, calendar } = harness(
      [],
      {
        networkWaiveSecret: secret,
        stageBNetworkCouponId: 'stage_b_network_credit',
      },
      stripe,
    );
    const failed = await handleConsultationRequest(
      request('/api/consultation/book', buyer({ network_token: token })),
      deps,
    );
    expect(failed.status).toBe(502);
    expect(await failed.json()).toEqual({ error: 'checkout' });
    expect(await networkLedger.get('jti-retry')).toBeNull();
    expect(await calendar.get('book_1')).toBeNull();

    fail = false;
    const retried = await handleConsultationRequest(
      request('/api/consultation/book', buyer({ network_token: token })),
      deps,
    );
    expect(retried.status).toBe(200);
    const saved = (await retried.json()) as { checkout_url: string };
    expect(saved.checkout_url).toBe('https://checkout.stripe.com/c/pay/cs_test_retry');
    expect((await networkLedger.get('jti-retry'))?.status).toBe('open');
    expect(calls).toBe(2);
  });

  it('rejects an expired token before any redemption row', async () => {
    const secret = 'network-test-secret';
    const { token } = await mintNetworkToken({
      secret,
      now: NOW,
      ttlSeconds: -10,
      jti: 'jti-expired',
    });
    const { deps, checkouts, networkLedger } = harness([], {
      networkWaiveSecret: secret,
      stageBNetworkCouponId: 'stage_b_network_credit',
    });
    const response = await handleConsultationRequest(
      request('/api/consultation/book', buyer({ network_token: token })),
      deps,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'network-token' });
    expect(checkouts).toHaveLength(0);
    expect(await networkLedger.get('jti-expired')).toBeNull();
  });

  it('rejects an email mismatch before any redemption row', async () => {
    const secret = 'network-test-secret';
    const { token } = await mintNetworkToken({
      secret,
      now: NOW,
      email: 'other@example.com',
      jti: 'jti-mismatch',
    });
    const { deps, checkouts, networkLedger } = harness([], {
      networkWaiveSecret: secret,
      stageBNetworkCouponId: 'stage_b_network_credit',
    });
    const response = await handleConsultationRequest(
      request('/api/consultation/book', buyer({ network_token: token })),
      deps,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'network-email' });
    expect(checkouts).toHaveLength(0);
    expect(await networkLedger.get('jti-mismatch')).toBeNull();
  });

  it('lets only one of two concurrent redeems win', async () => {
    const secret = 'network-test-secret';
    const { token } = await mintNetworkToken({ secret, now: NOW, jti: 'jti-race' });
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    const stripe: StripePort = {
      async createCheckout() {
        calls += 1;
        if (calls === 1) await gate;
        return { id: 'cs_test_race', url: 'https://checkout.stripe.com/c/pay/cs_test_race' };
      },
    };
    const { deps, networkLedger } = harness(
      [],
      {
        networkWaiveSecret: secret,
        stageBNetworkCouponId: 'stage_b_network_credit',
      },
      stripe,
    );
    const firstPromise = handleConsultationRequest(
      request('/api/consultation/book', buyer({ network_token: token })),
      deps,
    );
    for (let i = 0; i < 50 && calls === 0; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(calls).toBe(1);
    const second = await handleConsultationRequest(
      request('/api/consultation/book', buyer({ network_token: token })),
      deps,
    );
    expect(second.status).toBe(409);
    expect(await second.json()).toEqual({
      error: 'network-redeemed',
      message: NETWORK_LINK_USED,
    });
    release();
    const first = await firstPromise;
    expect(first.status).toBe(200);
    expect(calls).toBe(1);
    expect((await networkLedger.get('jti-race'))?.status).toBe('open');
    expect((await networkLedger.get('jti-race'))?.stripeSessionId).toBe('cs_test_race');
  });

  it('applies the address throttle before the redemption ledger', async () => {
    const secret = 'network-test-secret';
    const { token } = await mintNetworkToken({ secret, now: NOW, jti: 'jti-throttle' });
    const { deps, checkouts, networkLedger } = harness([], {
      networkWaiveSecret: secret,
      stageBNetworkCouponId: 'stage_b_network_credit',
    });
    const limited: ConsultationDeps = {
      ...deps,
      throttle: createConsultationThrottle({
        ...consultationRateConfigFromEnv({}),
        bookPerMinute: 1,
      }),
    };
    const first = await handleConsultationRequest(
      request('/api/consultation/book', buyer({ network_token: token })),
      limited,
    );
    expect(first.status).toBe(200);
    const second = await handleConsultationRequest(
      request('/api/consultation/book', buyer({ network_token: token })),
      limited,
    );
    expect(second.status).toBe(429);
    expect(await second.json()).toEqual({
      error: 'rate-limited',
      message: 'Too many requests. Please retry shortly.',
    });
    expect(checkouts).toHaveLength(1);
    expect((await networkLedger.get('jti-throttle'))?.status).toBe('open');
  });
});
