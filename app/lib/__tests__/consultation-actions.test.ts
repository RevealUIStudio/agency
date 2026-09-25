import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  type ActionStripe,
  CONSULTATION_ACTION_ORDER,
  type ConsultationActionDeps,
  consultationActions,
  runConsultationBook,
  runPaidConsultation,
} from '@/lib/consultation-actions';
import type { BookInput, Booking } from '@/lib/consultation-booking';
import {
  DEFAULT_CONSULTATION_PRICE_ID,
  DEFAULT_STAGE_B_PRICE_ID,
} from '@/lib/consultation-checkout';
import {
  consultationEnvFromProcess,
  createMemoryCalendar,
} from '../../../server/consultation-calendar';
import { stripeFromEnv } from '../../../server/consultation-stripe';

const NOW = new Date('2026-01-06T15:00:00.000Z');
const SLOT = {
  start: '2026-01-07T14:00:00.000Z',
  end: '2026-01-07T15:00:00.000Z',
};
const ORIGIN = 'https://revealuistudio.com';

function bookInput(extra: Partial<BookInput> = {}): BookInput {
  return {
    start: SLOT.start,
    end: SLOT.end,
    hours: 1,
    name: 'Ada Buyer',
    email: 'ada@example.com',
    company: 'Example Co',
    stageB: false,
    stageBFee: 'none',
    networkJti: null,
    ...extra,
  };
}

function heldBooking(extra: Partial<Booking> = {}): Booking {
  return {
    booking_id: 'book_held',
    ...SLOT,
    hours: 1,
    name: 'Ada Buyer',
    email: 'ada@example.com',
    company: null,
    stage_b: false,
    stage_b_fee: 'none',
    network_jti: null,
    status: 'slot_held',
    expires_at: new Date(NOW.getTime() + 20 * 60 * 1000).toISOString(),
    event_id: 'evt_held',
    meet_link: null,
    stripe_session_id: null,
    ...extra,
  };
}

function harness(seed: readonly Booking[] = []) {
  const calendar = createMemoryCalendar(seed);
  const checkouts: Array<{
    lines: readonly { price: string; quantity: number }[];
    couponId?: string;
    stageBFee: string;
  }> = [];
  const drafts: string[] = [];
  let schedules = 0;
  const wrapped = {
    expireHolds: (now: Date) => calendar.expireHolds(now),
    busy: (from: Date, to: Date, now: Date) => calendar.busy(from, to, now),
    putHold: (booking: Booking, now: Date) => calendar.putHold(booking, now),
    release: (bookingId: string) => calendar.release(bookingId),
    get: (bookingId: string) => calendar.get(bookingId),
    schedulePaid: async (booking: Booking, sessionId: string) => {
      schedules += 1;
      return calendar.schedulePaid(booking, sessionId);
    },
  };
  const stripe: ActionStripe = {
    async createCheckout(input) {
      checkouts.push({
        lines: input.lines,
        couponId: input.stageBNetworkCouponId,
        stageBFee: input.booking.stage_b_fee,
      });
      return { id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' };
    },
  };
  const deps: ConsultationActionDeps = {
    now: NOW,
    calendar: wrapped,
    stripe,
    origin: ORIGIN,
    onConfirmation: (email) => {
      drafts.push(email.text);
    },
  };
  return { calendar, checkouts, drafts, deps, schedules: () => schedules };
}

describe('consultation action registry', () => {
  it('lists the four actions in hold-before-checkout order', () => {
    expect(CONSULTATION_ACTION_ORDER).toEqual([
      'save_slot',
      'create_checkout_session',
      'write_calendar_meet_on_pay',
      'send_confirm_email',
    ]);
    expect(consultationActions.save_slot.humanGate).toBe('none');
    expect(consultationActions.create_checkout_session.humanGate).toBe('none');
    expect(consultationActions.write_calendar_meet_on_pay.humanGate).toBe('none');
    expect(consultationActions.send_confirm_email.humanGate).toBe('draft_only');
  });

  it('fails closed when checkout has no hold', async () => {
    const { deps, checkouts } = harness();
    const missing = await consultationActions.create_checkout_session.run(
      { bookingId: 'book_missing' },
      deps,
    );
    expect(missing).toEqual({ ok: false, error: 'hold-missing' });

    const unsaved = await consultationActions.create_checkout_session.run(
      { booking: heldBooking({ booking_id: 'book_unsaved' }) },
      deps,
    );
    expect(unsaved).toEqual({ ok: false, error: 'hold-missing' });
    expect(checkouts).toHaveLength(0);
  });

  it('fails closed when the hold has expired', async () => {
    const expired = heldBooking({
      expires_at: new Date(NOW.getTime() - 1000).toISOString(),
    });
    const { deps, checkouts } = harness([expired]);
    const result = await consultationActions.create_checkout_session.run(
      { bookingId: expired.booking_id },
      deps,
    );
    expect(result).toEqual({ ok: false, error: 'hold-expired' });
    expect(checkouts).toHaveLength(0);
  });

  it('refuses a slot outside availability', async () => {
    const { deps, calendar } = harness();
    const result = await consultationActions.save_slot.run(
      {
        bookingId: 'book_invented',
        input: bookInput({
          start: '2026-01-10T14:00:00.000Z',
          end: '2026-01-10T15:00:00.000Z',
        }),
      },
      deps,
    );
    expect(result).toEqual({ ok: false, error: 'slot-taken' });
    expect(await calendar.get('book_invented')).toBeNull();
  });

  it('holds then checks out with hour quantity and optional Stage B', async () => {
    const plain = harness();
    const saved = await runConsultationBook(bookInput(), 'book_1', plain.deps);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.value.checkoutUrl).toBe('https://checkout.stripe.com/c/pay/cs_test_1');
    expect(plain.checkouts[0]?.lines).toEqual([
      { price: DEFAULT_CONSULTATION_PRICE_ID, quantity: 1 },
    ]);
    expect(plain.checkouts[0]?.couponId).toBeUndefined();
    expect((await plain.calendar.get('book_1'))?.status).toBe('slot_held');

    const withPack = harness();
    const packed = await runConsultationBook(
      bookInput({
        stageB: true,
        stageBFee: 'paid_addon',
        end: '2026-01-07T17:00:00.000Z',
        hours: 3,
      }),
      'book_pack',
      { ...withPack.deps, stageBNetworkCouponId: 'stage_b_network_credit' },
    );
    expect(packed.ok).toBe(true);
    expect(withPack.checkouts[0]?.lines).toEqual([
      { price: DEFAULT_CONSULTATION_PRICE_ID, quantity: 3 },
      { price: DEFAULT_STAGE_B_PRICE_ID, quantity: 1 },
    ]);
    expect(withPack.checkouts[0]?.stageBFee).toBe('paid_addon');
    expect(withPack.checkouts[0]?.couponId).toBeUndefined();
    expect(withPack.checkouts[0]?.lines.every((line) => line.quantity >= 1)).toBe(true);
  });

  it('keeps a public Stage B add-on off the network coupon form', async () => {
    const forms: string[] = [];
    const fetchImpl: typeof fetch = async (_url, init) => {
      forms.push(String(init?.body ?? ''));
      return new Response(
        JSON.stringify({ id: 'cs_pub', url: 'https://checkout.stripe.com/c/pay/cs_pub' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };
    const stripe = stripeFromEnv('sk_test_consultation', fetchImpl);
    if (!stripe) throw new Error('stripe');
    const { deps } = harness();
    const booked = await runConsultationBook(
      bookInput({ stageB: true, stageBFee: 'paid_addon' }),
      'book_pub',
      {
        ...deps,
        stripe,
        stageBNetworkCouponId: 'stage_b_network_credit',
      },
    );
    expect(booked.ok).toBe(true);
    const params = new URLSearchParams(forms[0]);
    expect(params.get('line_items[1][price]')).toBe(DEFAULT_STAGE_B_PRICE_ID);
    expect(params.get('metadata[stage_b_fee]')).toBe('paid_addon');
    expect([...params.keys()].some((key) => key.startsWith('discounts'))).toBe(false);
  });

  it('applies the server coupon only for a network fee and skips the hold when it is missing', async () => {
    const network = bookInput({
      stageB: true,
      stageBFee: 'waived_network',
      networkJti: 'jti-net',
    });
    const blocked = harness();
    const refused = await runConsultationBook(network, 'book_net', blocked.deps);
    expect(refused).toEqual({ ok: false, error: 'network-coupon-unconfigured' });
    expect(blocked.checkouts).toHaveLength(0);
    expect(await blocked.calendar.get('book_net')).toBeNull();

    const allowed = harness();
    const booked = await runConsultationBook(network, 'book_net', {
      ...allowed.deps,
      stageBNetworkCouponId: 'stage_b_network_credit',
    });
    expect(booked.ok).toBe(true);
    expect(allowed.checkouts[0]?.lines).toEqual([
      { price: DEFAULT_CONSULTATION_PRICE_ID, quantity: 1 },
      { price: DEFAULT_STAGE_B_PRICE_ID, quantity: 1 },
    ]);
    expect(allowed.checkouts[0]?.couponId).toBe('stage_b_network_credit');
    expect(allowed.checkouts[0]?.stageBFee).toBe('waived_network');
  });

  it('releases the hold when Checkout fails', async () => {
    const { deps, calendar } = harness();
    const failing: ActionStripe = {
      async createCheckout() {
        throw new Error('stripe-down');
      },
    };
    const result = await runConsultationBook(bookInput(), 'book_fail', {
      ...deps,
      stripe: failing,
    });
    expect(result).toEqual({ ok: false, error: 'checkout' });
    expect(await calendar.get('book_fail')).toBeNull();
  });

  it('writes Meet once and returns already_scheduled on the second call', async () => {
    const { deps, calendar, drafts, schedules } = harness();
    const booked = await runConsultationBook(bookInput(), 'book_pay', deps);
    expect(booked.ok).toBe(true);
    const metadata = {
      booking_id: 'book_pay',
      start: SLOT.start,
      end: SLOT.end,
      hours: '1',
      stage_b: 'false',
      buyer_email: 'ada@example.com',
      buyer_name: 'Ada Buyer',
      company: 'Example Co',
    };
    const stored = await calendar.get('book_pay');
    const first = await runPaidConsultation(
      {
        paymentStatus: 'paid',
        sessionId: 'cs_test_1',
        metadata,
        booking: stored,
      },
      deps,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.action).toBe('scheduled');
    expect(first.value.desk).toBe('no-desk-writer');
    expect(first.value.confirm?.delivery).toBe('draft');
    expect(first.value.confirm?.channel).toBe('calendar_meet_invite');
    expect(first.value.booking.meet_link).toContain('meet.google.com');
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).not.toMatch(/waiv/i);

    const second = await runPaidConsultation(
      {
        paymentStatus: 'paid',
        sessionId: 'cs_test_1',
        metadata,
        booking: await calendar.get('book_pay'),
      },
      deps,
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.action).toBe('already_scheduled');
    expect(second.value.confirm).toBeNull();
    expect(schedules()).toBe(1);
    expect(drafts).toHaveLength(1);
  });

  it('rejects pay-first and an unpaid session', async () => {
    const { deps } = harness();
    const unpaid = await consultationActions.write_calendar_meet_on_pay.run(
      {
        paymentStatus: 'unpaid',
        sessionId: 'cs_unpaid',
        metadata: { booking_id: 'book_pay' },
        booking: null,
      },
      deps,
    );
    expect(unpaid).toEqual({ ok: false, error: 'payment-required' });

    const direct = await consultationActions.send_confirm_email.run(
      { booking: heldBooking() },
      deps,
    );
    expect(direct).toEqual({ ok: false, error: 'not-scheduled' });
  });

  it('keeps confirm as a draft when the sink throws', async () => {
    const { deps } = harness();
    const paid = heldBooking({
      booking_id: 'book_draft',
      status: 'paid_scheduled',
      meet_link: 'https://meet.google.com/lookup/book_draft',
      event_id: 'evt_draft',
      stripe_session_id: 'cs_draft',
    });
    const result = await consultationActions.send_confirm_email.run(
      { booking: paid },
      {
        ...deps,
        onConfirmation: () => {
          throw new Error('sink-down');
        },
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.delivery).toBe('draft');
    expect(result.value.channel).toBe('calendar_meet_invite');
    expect(result.value.email.to).toBe('ada@example.com');
  });

  it('does not read a mail provider key from the environment', () => {
    const env = consultationEnvFromProcess({
      RESEND_API_KEY: 're_test_not_used',
      RESEND_FROM: 'buyer@example.com',
      CONSULTATION_CONFIRM_SEND: '1',
      STRIPE_SECRET_KEY: 'sk_test_consultation',
    });
    expect(env).not.toHaveProperty('resendApiKey');
    expect(env).not.toHaveProperty('resendFrom');
    expect(JSON.stringify(env)).not.toContain('re_test_not_used');
    expect(JSON.stringify(env)).not.toContain('CONSULTATION_CONFIRM_SEND');
  });

  it('keeps mail-provider wiring out of the registry path', () => {
    const root = path.resolve(import.meta.dirname, '../../..');
    const files = [
      'app/lib/consultation-actions.ts',
      'server/consultation-http.ts',
      'server/consultation-calendar.ts',
      'docs/consultation-confirm-email.md',
      'docs/consultation-actions.md',
      'docs/CUTOVER.md',
    ];
    const banned = [/RESEND_/, /api\.resend\.com/, /CONSULTATION_CONFIRM_SEND/, /RevFleet/];
    const hits: string[] = [];
    for (const rel of files) {
      const text = readFileSync(path.join(root, rel), 'utf8');
      if (banned.some((pattern) => pattern.test(text))) hits.push(rel);
    }
    expect(hits).toEqual([]);
    const http = readFileSync(path.join(root, 'server/consultation-http.ts'), 'utf8');
    expect(http).not.toContain('consultationCheckoutLines');
    expect(http).toContain('runConsultationBook');
    expect(http).toContain('runPaidConsultation');
  });
});
