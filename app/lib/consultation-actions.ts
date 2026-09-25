/**
 * Consultation book to pay action registry.
 *
 * Buyer UI and a future Bot import this module. Amounts, Stage B lines,
 * hold order, and the confirm gate live here. HTTP handlers call `run`.
 *
 * Order is load-bearing: `save_slot` before `create_checkout_session`.
 * Stage B on the public path is an optional paid add-on. Network credit is
 * a signed book link plus a server coupon. This module does not send mail.
 * The buyer invite is the Calendar event with Google Meet.
 */

import {
  type BookInput,
  type Booking,
  buildConfirmationEmail,
  type ConfirmationEmail,
  createHold,
  deskScheduleTransition,
  stageBFeeOf,
} from './consultation-booking';
import {
  CheckoutDiscountError,
  type CheckoutLine,
  consultationCheckoutLines,
} from './consultation-checkout';
import { generateConsultationSlots, type TimeInterval } from './consultation-slots';

export type HumanGate = 'none' | 'draft_only' | 'owner_send' | 'owner_secrets';

export type ConsultationActionId =
  | 'save_slot'
  | 'create_checkout_session'
  | 'write_calendar_meet_on_pay'
  | 'send_confirm_email';

export const CONSULTATION_ACTION_ORDER = [
  'save_slot',
  'create_checkout_session',
  'write_calendar_meet_on_pay',
  'send_confirm_email',
] as const satisfies readonly ConsultationActionId[];

export type ActionError =
  | 'slot-taken'
  | 'calendar'
  | 'hold-missing'
  | 'hold-expired'
  | 'checkout'
  | 'network-coupon-unconfigured'
  | 'payment-required'
  | 'booking-missing'
  | 'not-scheduled';

export type ActionResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ActionError };

export interface SchedulePaidResult {
  readonly booking: Booking;
  readonly action: 'scheduled' | 'already_scheduled';
  readonly desk: 'no-desk-writer';
}

/** Structural calendar port. The Google adapter and the memory adapter both fit. */
export interface ActionCalendar {
  expireHolds(now: Date): Promise<void>;
  busy(from: Date, to: Date, now: Date): Promise<readonly TimeInterval[]>;
  putHold(booking: Booking, now: Date): Promise<Booking>;
  release(bookingId: string): Promise<void>;
  get(bookingId: string): Promise<Booking | null>;
  schedulePaid(booking: Booking, stripeSessionId: string): Promise<SchedulePaidResult>;
}

export interface ActionStripe {
  createCheckout(input: {
    readonly booking: Booking;
    readonly lines: readonly CheckoutLine[];
    readonly successUrl: string;
    readonly cancelUrl: string;
    readonly stageBNetworkCouponId?: string;
  }): Promise<{ readonly id: string; readonly url: string }>;
}

export interface ConsultationActionDeps {
  readonly now: Date;
  readonly calendar: ActionCalendar;
  readonly stripe?: ActionStripe;
  readonly origin?: string;
  readonly consultationPriceId?: string;
  readonly stageBPriceId?: string;
  readonly stageBNetworkCouponId?: string;
  readonly onConfirmation?: (email: ConfirmationEmail) => void;
}

export interface ConsultationAction<TInput, TValue> {
  readonly id: ConsultationActionId;
  readonly description: string;
  readonly humanGate: HumanGate;
  readonly preconditions: readonly string[];
  readonly sideEffects: readonly string[];
  idempotencyKey(input: TInput): string;
  run(input: TInput, deps: ConsultationActionDeps): Promise<ActionResult<TValue>>;
}

export interface SaveSlotInput {
  readonly bookingId: string;
  readonly input: BookInput;
}

export interface SaveSlotValue {
  readonly booking: Booking;
}

export interface CreateCheckoutInput {
  readonly bookingId?: string;
  readonly booking?: Booking;
}

export interface CheckoutSessionValue {
  readonly checkoutUrl: string;
  readonly stripeSessionId: string;
  readonly lines: readonly CheckoutLine[];
  readonly booking: Booking;
}

export interface PaidMeetInput {
  readonly paymentStatus: string;
  readonly sessionId: string;
  readonly metadata: Record<string, unknown>;
  readonly booking: Booking | null;
}

export interface PaidMeetValue {
  readonly action: 'scheduled' | 'already_scheduled';
  readonly booking: Booking;
  readonly desk: 'no-desk-writer';
}

export interface SendConfirmInput {
  readonly booking: Booking;
}

export interface ConfirmDraft {
  readonly email: ConfirmationEmail;
  readonly delivery: 'draft';
  readonly channel: 'calendar_meet_invite';
}

export interface BookedCheckout {
  readonly bookingId: string;
  readonly checkoutUrl: string;
  readonly booking: Booking;
}

export interface PaidConsultationValue {
  readonly status: 'paid_scheduled';
  readonly action: 'scheduled' | 'already_scheduled';
  readonly booking: Booking;
  readonly desk: 'no-desk-writer';
  readonly confirm: ConfirmDraft | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function fail<T>(error: ActionError): ActionResult<T> {
  return { ok: false, error };
}

function isSlotTaken(error: unknown): boolean {
  return error instanceof Error && error.name === 'SlotTakenError';
}

function bookingIdOf(metadata: Record<string, unknown>, booking: Booking | null): string {
  if (typeof metadata.booking_id === 'string' && metadata.booking_id.length > 0) {
    return metadata.booking_id;
  }
  return booking?.booking_id ?? '';
}

function restoreBooking(metadata: Record<string, unknown>, sessionId: string): Booking | null {
  const bookingId = metadata.booking_id;
  const start = metadata.start;
  const end = metadata.end;
  const name = metadata.buyer_name;
  const email = metadata.buyer_email;
  const hours = Number(metadata.hours);
  if (typeof bookingId !== 'string' || typeof start !== 'string' || typeof end !== 'string') {
    return null;
  }
  if (typeof name !== 'string' || typeof email !== 'string' || !Number.isInteger(hours)) {
    return null;
  }
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  return {
    booking_id: bookingId,
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    hours,
    name,
    email,
    company:
      typeof metadata.company === 'string' && metadata.company.trim().length > 0
        ? metadata.company.trim()
        : null,
    stage_b:
      stageBFeeOf(metadata.stage_b_fee, metadata.stage_b === 'true') === 'waived_network' ||
      metadata.stage_b === 'true',
    stage_b_fee: stageBFeeOf(metadata.stage_b_fee, metadata.stage_b === 'true'),
    network_jti:
      typeof metadata.network_jti === 'string' && metadata.network_jti.length > 0
        ? metadata.network_jti
        : null,
    status: 'slot_held',
    expires_at: new Date(0).toISOString(),
    event_id: null,
    meet_link: null,
    stripe_session_id: sessionId || null,
  };
}

const saveSlot: ConsultationAction<SaveSlotInput, SaveSlotValue> = {
  id: 'save_slot',
  description: 'Hold a Consultation slot before payment.',
  humanGate: 'none',
  preconditions: [
    'The slot is one of the generated weekday availability rows.',
    'Body fields waive and stage_b_fee are not inputs. Fee mode is already resolved.',
  ],
  sideEffects: ['calendar.putHold with status slot_held'],
  idempotencyKey(input) {
    return input.bookingId;
  },
  async run(input, deps) {
    const windowFrom = new Date(Date.parse(input.input.start) - DAY_MS);
    const windowTo = new Date(Date.parse(input.input.end) + DAY_MS);
    let open = false;
    try {
      await deps.calendar.expireHolds(deps.now);
      const busy = await deps.calendar.busy(windowFrom, windowTo, deps.now);
      const slots = generateConsultationSlots({
        from: windowFrom,
        to: windowTo,
        now: deps.now,
        hours: input.input.hours,
        busy,
      });
      open = slots.some((slot) => slot.start === input.input.start && slot.end === input.input.end);
    } catch {
      return fail('calendar');
    }
    if (!open) return fail('slot-taken');

    const hold = createHold(input.input, deps.now, input.bookingId);
    try {
      const stored = await deps.calendar.putHold(hold, deps.now);
      return { ok: true, value: { booking: stored } };
    } catch (error) {
      if (isSlotTaken(error)) return fail('slot-taken');
      await deps.calendar.release(input.bookingId).catch(() => undefined);
      return fail('calendar');
    }
  },
};

const createCheckoutSession: ConsultationAction<CreateCheckoutInput, CheckoutSessionValue> = {
  id: 'create_checkout_session',
  description:
    'Open Stripe Checkout for a live slot hold. Stage B is an optional paid add-on. Network credit is a server coupon only.',
  humanGate: 'none',
  preconditions: [
    'A slot_held booking exists and has not expired.',
    'Line items come from consultationCheckoutLines only.',
    'A network coupon is attached only when stage_b_fee is waived_network.',
  ],
  sideEffects: ['stripe.createCheckout'],
  idempotencyKey(input) {
    return input.booking?.booking_id ?? input.bookingId ?? 'missing';
  },
  async run(input, deps) {
    const bookingId = input.booking?.booking_id ?? input.bookingId ?? '';
    if (!bookingId) return fail('hold-missing');
    if (!deps.stripe || !deps.origin) return fail('checkout');

    let stored: Booking | null;
    try {
      stored = await deps.calendar.get(bookingId);
    } catch {
      return fail('calendar');
    }
    if (stored?.status !== 'slot_held') return fail('hold-missing');
    if (Date.parse(stored.expires_at) <= deps.now.getTime()) return fail('hold-expired');

    if (stored.stage_b_fee === 'waived_network') {
      const coupon = deps.stageBNetworkCouponId?.trim() ?? '';
      if (!stored.stage_b || !stored.network_jti || !coupon) {
        return fail('network-coupon-unconfigured');
      }
    }

    let lines: readonly CheckoutLine[];
    try {
      lines = consultationCheckoutLines({
        hours: stored.hours,
        stageB: stored.stage_b,
        consultationPriceId: deps.consultationPriceId,
        stageBPriceId: deps.stageBPriceId,
      });
    } catch {
      return fail('checkout');
    }
    if (lines.some((line) => line.quantity < 1 || line.price.trim() === '')) {
      return fail('checkout');
    }

    try {
      const session = await deps.stripe.createCheckout({
        booking: stored,
        lines,
        successUrl: `${deps.origin}/consultation/book/success?booking=${encodeURIComponent(stored.booking_id)}`,
        cancelUrl: `${deps.origin}/consultation/book/cancel`,
        stageBNetworkCouponId:
          stored.stage_b_fee === 'waived_network' ? deps.stageBNetworkCouponId : undefined,
      });
      return {
        ok: true,
        value: {
          checkoutUrl: session.url,
          stripeSessionId: session.id,
          lines,
          booking: stored,
        },
      };
    } catch (error) {
      if (error instanceof CheckoutDiscountError) return fail('network-coupon-unconfigured');
      return fail('checkout');
    }
  },
};

const writeCalendarMeetOnPay: ConsultationAction<PaidMeetInput, PaidMeetValue> = {
  id: 'write_calendar_meet_on_pay',
  description: 'After payment, write the founder calendar event and Google Meet link.',
  humanGate: 'none',
  preconditions: [
    'payment_status is paid.',
    'A second delivery of the same booking does not mint another Meet link.',
  ],
  sideEffects: ['calendar.schedulePaid', 'deskScheduleTransition (no desk writer yet)'],
  idempotencyKey(input) {
    return `${bookingIdOf(input.metadata, input.booking)}:${input.sessionId}`;
  },
  async run(input, deps) {
    if (input.paymentStatus !== 'paid') return fail('payment-required');
    if (!bookingIdOf(input.metadata, input.booking)) return fail('booking-missing');

    if (input.booking?.status === 'paid_scheduled') {
      return {
        ok: true,
        value: {
          action: 'already_scheduled',
          booking: input.booking,
          desk: deskScheduleTransition(input.booking).reason,
        },
      };
    }

    const booking = input.booking ?? restoreBooking(input.metadata, input.sessionId);
    if (!booking) return fail('booking-missing');

    try {
      const scheduled = await deps.calendar.schedulePaid(booking, input.sessionId);
      return {
        ok: true,
        value: {
          action: scheduled.action,
          booking: scheduled.booking,
          desk: deskScheduleTransition(scheduled.booking).reason,
        },
      };
    } catch {
      return fail('calendar');
    }
  },
};

const sendConfirmEmail: ConsultationAction<SendConfirmInput, ConfirmDraft> = {
  id: 'send_confirm_email',
  description:
    'Build the confirmation draft. The buyer invite is the Calendar event with Google Meet. This action does not send mail.',
  humanGate: 'draft_only',
  preconditions: ['The booking status is paid_scheduled.'],
  sideEffects: ['onConfirmation draft sink', 'no outbound mail'],
  idempotencyKey(input) {
    return input.booking.booking_id;
  },
  async run(input, deps) {
    if (input.booking.status !== 'paid_scheduled') return fail('not-scheduled');
    const email = buildConfirmationEmail(input.booking);
    try {
      deps.onConfirmation?.(email);
    } catch {
      // The calendar event already exists. A draft sink failure must not roll it back.
    }
    return {
      ok: true,
      value: {
        email,
        delivery: 'draft',
        channel: 'calendar_meet_invite',
      },
    };
  },
};

export const consultationActions = {
  save_slot: saveSlot,
  create_checkout_session: createCheckoutSession,
  write_calendar_meet_on_pay: writeCalendarMeetOnPay,
  send_confirm_email: sendConfirmEmail,
} as const;

function mapBookFailure(error: ActionError): ActionError {
  if (error === 'hold-missing' || error === 'hold-expired') return 'slot-taken';
  return error;
}

/** POST /api/consultation/book. Hold first, then Checkout. Release the hold if Checkout fails. */
export async function runConsultationBook(
  input: BookInput,
  bookingId: string,
  deps: ConsultationActionDeps,
): Promise<ActionResult<BookedCheckout>> {
  if (input.stageBFee === 'waived_network' && !deps.stageBNetworkCouponId?.trim()) {
    return fail('network-coupon-unconfigured');
  }
  const saved = await consultationActions.save_slot.run({ bookingId, input }, deps);
  if (!saved.ok) return saved;
  const checkout = await consultationActions.create_checkout_session.run(
    { booking: saved.value.booking },
    deps,
  );
  if (!checkout.ok) {
    await deps.calendar.release(bookingId).catch(() => undefined);
    return fail(mapBookFailure(checkout.error));
  }
  return {
    ok: true,
    value: {
      bookingId,
      checkoutUrl: checkout.value.checkoutUrl,
      booking: checkout.value.booking,
    },
  };
}

/** Paid webhook path. Meet write first. Confirm is a draft and cannot fail the calendar write. */
export async function runPaidConsultation(
  input: PaidMeetInput,
  deps: ConsultationActionDeps,
): Promise<ActionResult<PaidConsultationValue>> {
  const wrote = await consultationActions.write_calendar_meet_on_pay.run(input, deps);
  if (!wrote.ok) return wrote;
  if (wrote.value.action !== 'scheduled') {
    return {
      ok: true,
      value: {
        status: 'paid_scheduled',
        action: wrote.value.action,
        booking: wrote.value.booking,
        desk: wrote.value.desk,
        confirm: null,
      },
    };
  }
  const draft = await consultationActions.send_confirm_email.run(
    { booking: wrote.value.booking },
    deps,
  );
  return {
    ok: true,
    value: {
      status: 'paid_scheduled',
      action: 'scheduled',
      booking: wrote.value.booking,
      desk: wrote.value.desk,
      confirm: draft.ok ? draft.value : null,
    },
  };
}
