import { describe, expect, it } from 'vitest';
import type { Booking, ConfirmationEmail } from '../../app/lib/consultation-booking';
import {
  DEFAULT_CONSULTATION_PRICE_ID,
  DEFAULT_STAGE_B_PRICE_ID,
} from '../../app/lib/consultation-checkout';
import {
  type CalendarPort,
  type ConsultationEnv,
  createMemoryCalendar,
} from '../consultation-calendar';
import { type ConsultationDeps, handleConsultationRequest } from '../consultation-http';
import { type StripePort, stripeSignatureHeader } from '../consultation-stripe';

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

function harness(seed: readonly Booking[] = []) {
  const calendar = createMemoryCalendar(seed);
  const checkouts: Array<{
    lines: readonly { price: string; quantity: number }[];
    successUrl: string;
    cancelUrl: string;
  }> = [];
  const emails: ConfirmationEmail[] = [];
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
  const stripe: StripePort = {
    async createCheckout(input) {
      checkouts.push({
        lines: input.lines,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      });
      return { id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' };
    },
  };
  const env: ConsultationEnv = {
    stripeSecretKey: 'sk_test_consultation',
    stripeWebhookSecret: SECRET,
    publicSiteUrl: 'https://revealuistudio.com',
    calendarId: 'founder',
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
  };
  return {
    calendar,
    checkouts,
    emails,
    deps,
    schedules: () => schedules,
    desk: () => desk,
  };
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
  });

  it('schedules once, stores the Meet link, and ignores a second webhook', async () => {
    const { deps, calendar, emails, schedules, desk } = harness();
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
    expect(emails[0]?.text).toContain('Payment received');
    expect(emails[0]?.text).toContain(paid?.meet_link);

    const second = await handleConsultationRequest(
      request('/api/stripe/webhook', raw, { 'stripe-signature': header }),
      deps,
    );
    expect(second.status).toBe(200);
    expect(schedules()).toBe(1);
    expect((await calendar.get(saved.booking_id))?.meet_link).toBe(paid?.meet_link);
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
});
