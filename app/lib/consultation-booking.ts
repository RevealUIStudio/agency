/**
 * Consultation booking record, request parsing, and the paid transition.
 *
 * A second paid delivery is a no-op. Stage B fee mode comes from a verified
 * network token on the server. Body fields `waive` and `stage_b_fee` are ignored.
 */

import { confirmationSubject, confirmationText } from './consultation-buyer';
import { CONSULTATION_HOUR_MAX, CONSULTATION_HOUR_MIN } from './consultation-hours';
import type { NetworkWaiveClaims } from './consultation-network-waive';
import { HOLD_TTL_MS } from './consultation-slots';

export type BookingStatus = 'slot_held' | 'paid_scheduled';

/** none: pack off. paid_addon: list price. waived_network: pack on, coupon at Checkout. */
export type StageBFee = 'none' | 'paid_addon' | 'waived_network';

export interface Booking {
  readonly booking_id: string;
  readonly start: string;
  readonly end: string;
  readonly hours: number;
  readonly name: string;
  readonly email: string;
  readonly company: string | null;
  readonly stage_b: boolean;
  readonly stage_b_fee: StageBFee;
  readonly network_jti: string | null;
  readonly status: BookingStatus;
  readonly expires_at: string;
  readonly event_id: string | null;
  readonly meet_link: string | null;
  readonly stripe_session_id: string | null;
}

export interface BookInput {
  readonly start: string;
  readonly end: string;
  readonly hours: number;
  readonly name: string;
  readonly email: string;
  readonly company: string | null;
  readonly stageB: boolean;
  readonly stageBFee: StageBFee;
  readonly networkJti: string | null;
}

export interface ParsedBook {
  readonly start: string;
  readonly end: string;
  readonly hours: number;
  readonly name: string;
  readonly email: string;
  readonly company: string | null;
  readonly stageB: boolean;
  readonly networkToken: string | null;
}

export interface ConfirmationEmail {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isoInstant(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

export function stageBFeeOf(value: unknown, stageB: boolean): StageBFee {
  if (value === 'none' || value === 'paid_addon' || value === 'waived_network') return value;
  return stageB ? 'paid_addon' : 'none';
}

export function parseBookBody(raw: unknown): ParsedBook | null {
  const body = asRecord(raw);
  if (!body) return null;
  const start = isoInstant(body.start);
  const end = isoInstant(body.end);
  if (!start || !end) return null;

  const hours = body.hours === undefined ? 1 : body.hours;
  if (typeof hours !== 'number' || !Number.isInteger(hours)) return null;
  if (hours < CONSULTATION_HOUR_MIN || hours > CONSULTATION_HOUR_MAX) return null;
  if (Date.parse(end) - Date.parse(start) !== hours * 60 * 60 * 1000) return null;

  if (typeof body.name !== 'string') return null;
  const name = body.name.trim();
  if (name.length < 1 || name.length > 120) return null;

  if (typeof body.email !== 'string') return null;
  const email = body.email.trim().toLowerCase();
  if (email.length > 200 || !EMAIL_PATTERN.test(email)) return null;

  let company: string | null = null;
  if (body.company !== undefined && body.company !== null) {
    if (typeof body.company !== 'string') return null;
    const trimmed = body.company.trim();
    if (trimmed.length > 160) return null;
    company = trimmed.length > 0 ? trimmed : null;
  }

  if (body.stage_b !== undefined && typeof body.stage_b !== 'boolean') return null;

  let networkToken: string | null = null;
  if (body.network_token !== undefined && body.network_token !== null) {
    if (typeof body.network_token !== 'string') return null;
    const trimmed = body.network_token.trim();
    if (trimmed.length > 4096) return null;
    networkToken = trimmed.length > 0 ? trimmed : null;
  }

  return {
    start,
    end,
    hours,
    name,
    email,
    company,
    stageB: body.stage_b === true,
    networkToken,
  };
}

/**
 * Fee mode is the verified token, or the checkbox. `waive` and `stage_b_fee`
 * in the body never reach this function.
 */
export function bookInputFromNetwork(
  parsed: ParsedBook,
  claims: NetworkWaiveClaims | null,
): BookInput {
  if (!claims) {
    return {
      start: parsed.start,
      end: parsed.end,
      hours: parsed.hours,
      name: parsed.name,
      email: parsed.email,
      company: parsed.company,
      stageB: parsed.stageB,
      stageBFee: parsed.stageB ? 'paid_addon' : 'none',
      networkJti: null,
    };
  }
  return {
    start: parsed.start,
    end: parsed.end,
    hours: parsed.hours,
    name: parsed.name,
    email: parsed.email,
    company: parsed.company,
    stageB: true,
    stageBFee: 'waived_network',
    networkJti: claims.jti,
  };
}

export function createHold(input: BookInput, now: Date, bookingId: string): Booking {
  return {
    booking_id: bookingId,
    start: input.start,
    end: input.end,
    hours: input.hours,
    name: input.name,
    email: input.email,
    company: input.company,
    stage_b: input.stageBFee === 'waived_network' ? true : input.stageB,
    stage_b_fee: input.stageBFee,
    network_jti: input.networkJti,
    status: 'slot_held',
    expires_at: new Date(now.getTime() + HOLD_TTL_MS).toISOString(),
    event_id: null,
    meet_link: null,
    stripe_session_id: null,
  };
}

export interface PaidScheduleResult {
  readonly action: 'scheduled' | 'already_scheduled';
  readonly booking: Booking;
}

/** Second delivery of the same booking does not mint another Meet link. */
export function applyPaidSchedule(
  booking: Booking,
  patch: { readonly meetLink: string; readonly eventId: string; readonly stripeSessionId: string },
): PaidScheduleResult {
  if (booking.status === 'paid_scheduled') {
    return { action: 'already_scheduled', booking };
  }
  return {
    action: 'scheduled',
    booking: {
      ...booking,
      status: 'paid_scheduled',
      meet_link: patch.meetLink,
      event_id: patch.eventId,
      stripe_session_id: patch.stripeSessionId,
    },
  };
}

/**
 * No Desk sheet writer exists in this repo. The calendar event is the record.
 * A later writer can map slot_held → paid_scheduled without a public credit UI.
 */
export function deskScheduleTransition(booking: Booking): {
  readonly applied: false;
  readonly reason: 'no-desk-writer';
  readonly booking_id: string;
  readonly status: BookingStatus;
} {
  return {
    applied: false,
    reason: 'no-desk-writer',
    booking_id: booking.booking_id,
    status: booking.status,
  };
}

export function buildConfirmationEmail(booking: Booking): ConfirmationEmail {
  return {
    to: booking.email,
    subject: confirmationSubject(booking.start, booking.end),
    text: confirmationText(booking),
  };
}
