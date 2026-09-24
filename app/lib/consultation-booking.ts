/**
 * Consultation booking record, request parsing, and the paid transition.
 *
 * A second paid delivery is a no-op. Stage B on this path is the list price
 * only. A `waive` field in the body is ignored.
 */

import { confirmationSubject, confirmationText } from './consultation-buyer';
import { CONSULTATION_HOUR_MAX, CONSULTATION_HOUR_MIN } from './consultation-hours';
import { HOLD_TTL_MS } from './consultation-slots';

export type BookingStatus = 'slot_held' | 'paid_scheduled';

export interface Booking {
  readonly booking_id: string;
  readonly start: string;
  readonly end: string;
  readonly hours: number;
  readonly name: string;
  readonly email: string;
  readonly company: string | null;
  readonly stage_b: boolean;
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

export function parseBookBody(raw: unknown): BookInput | null {
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

  return {
    start,
    end,
    hours,
    name,
    email,
    company,
    stageB: body.stage_b === true,
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
    stage_b: input.stageB,
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
