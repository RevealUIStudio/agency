/**
 * Consultation booker rules.
 *
 * Weekday 60-minute slots in America/New_York, 09:00-17:00.
 * Slot save happens before Stripe Checkout. Stage B is an optional paid add-on.
 */

import { consultationDueCents } from './consultation-hours';
import { STAGE_B_CENTS } from './stage-b-invoice';

export const CONSULTATION_TIME_ZONE = 'America/New_York' as const;
export const CONSULTATION_SLOT_MINUTES = 60 as const;
export const CONSULTATION_DAY_START_HOUR = 9 as const;
export const CONSULTATION_DAY_END_HOUR = 17 as const;
/** Buyer must start at least this far ahead, so Checkout can finish. */
export const CONSULTATION_LEAD_MS = 60 * 60 * 1000;
/** Soft hold. Stripe Checkout cannot expire sooner than 30 minutes. */
export const CONSULTATION_HOLD_TTL_MS = 30 * 60 * 1000;
export const CONSULTATION_HORIZON_MS = 21 * 24 * 60 * 60 * 1000;
export const CONSULTATION_MAX_RANGE_MS = 62 * 24 * 60 * 60 * 1000;

/** Live Consultation price. Quantity is the hour count. */
export const CONSULTATION_STRIPE_PRICE_ID = 'price_1TxpQTJz64n6uEibitNE5eJP' as const;
/** Live Stage B price. Optional paid add-on, quantity 1. */
export const STAGE_B_STRIPE_PRICE_ID = 'price_1UIjpPJz64n6uEibxJOYKJ3t' as const;

export const BOOK_PAGE_HEADING = 'Book a Consultation' as const;
export const BOOK_PAGE_LEAD =
  'Weekday times, 9:00 AM to 5:00 PM Eastern. A Consultation is 60 minutes at $300. Save the time, then pay on Stripe Checkout.' as const;
export const STAGE_B_ADDON_LABEL = 'Add Stage B ($297)' as const;
export const STAGE_B_ADDON_DETAIL =
  'Optional paid add-on. It stays off unless you check it.' as const;
export const BOOK_SUBMIT_LABEL = 'Continue to payment' as const;
export const SUCCESS_HEADING = 'Payment received' as const;
export const SUCCESS_BODY =
  'Payment received. Your Meet link arrives in the confirmation.' as const;
export const CANCEL_HEADING = 'Checkout canceled' as const;
export const CANCEL_BODY =
  'No payment was taken. The time hold ends on its own. Pick another time if you still want a Consultation.' as const;
export const BOOK_UNAVAILABLE =
  'Consultation times are not available right now. Try again later.' as const;
export const BOOK_EMPTY = 'No open weekday times in this range.' as const;
export const BOOK_SLOT_TAKEN = 'That time was just held. Pick another slot.' as const;
export const BOOK_INVALID = 'Check the form and try again.' as const;

export const CONSULTATION_BOOK_META = {
  title: 'Book a Consultation | RevealUI Studio',
  description:
    'Pick a 60-minute weekday Consultation in Eastern Time. $300. Pay on Stripe Checkout after you save the time.',
} as const;

export const CONSULTATION_BOOK_SUCCESS_META = {
  title: 'Consultation payment received | RevealUI Studio',
  description: SUCCESS_BODY,
  robots: 'noindex,follow',
} as const;

export const CONSULTATION_BOOK_CANCEL_META = {
  title: 'Consultation checkout canceled | RevealUI Studio',
  description: CANCEL_BODY,
  robots: 'noindex,follow',
} as const;

export const PUBLIC_BOOKER_STRINGS = [
  BOOK_PAGE_HEADING,
  BOOK_PAGE_LEAD,
  STAGE_B_ADDON_LABEL,
  STAGE_B_ADDON_DETAIL,
  BOOK_SUBMIT_LABEL,
  SUCCESS_HEADING,
  SUCCESS_BODY,
  CANCEL_HEADING,
  CANCEL_BODY,
  BOOK_UNAVAILABLE,
  BOOK_EMPTY,
  BOOK_SLOT_TAKEN,
  BOOK_INVALID,
  CONSULTATION_BOOK_META.title,
  CONSULTATION_BOOK_META.description,
  CONSULTATION_BOOK_SUCCESS_META.title,
  CONSULTATION_BOOK_SUCCESS_META.description,
  CONSULTATION_BOOK_CANCEL_META.title,
  CONSULTATION_BOOK_CANCEL_META.description,
] as const;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export interface CivilDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface ZonedParts extends CivilDate {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly weekday: number;
}

export interface TimeInterval {
  readonly start: string;
  readonly end: string;
}

export interface ConsultationSlot {
  readonly start: string;
  readonly end: string;
  readonly label: string;
  readonly dayLabel: string;
}

export interface CheckoutLine {
  readonly price: string;
  readonly quantity: number;
}

export interface CheckoutMetadata {
  readonly booking_id: string;
  readonly start: string;
  readonly end: string;
  readonly hours: string;
  readonly stage_b: 'true' | 'false';
  readonly buyer_email: string;
  readonly buyer_name: string;
  readonly company: string;
}

export interface CheckoutDraft {
  readonly bookingId: string;
  readonly start: string;
  readonly end: string;
  readonly hours: number;
  readonly stageB: boolean;
  readonly buyerEmail: string;
  readonly buyerName: string;
  readonly company: string;
}

export function zonedParts(date: Date, timeZone: string = CONSULTATION_TIME_ZONE): ZonedParts {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const map = new Map<string, string>();
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== 'literal') map.set(part.type, part.value);
  }
  const weekdayLabel = map.get('weekday') ?? '';
  const weekday = WEEKDAYS.findIndex((day) => weekdayLabel.startsWith(day));
  let hour = Number(map.get('hour'));
  if (hour === 24) hour = 0;
  return {
    year: Number(map.get('year')),
    month: Number(map.get('month')),
    day: Number(map.get('day')),
    hour,
    minute: Number(map.get('minute')),
    second: Number(map.get('second')),
    weekday,
  };
}

function offsetMs(utcMs: number, timeZone: string): number {
  const parts = zonedParts(new Date(utcMs), timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - utcMs;
}

/** Wall-clock time in `timeZone` as a UTC instant. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone = CONSULTATION_TIME_ZONE,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const utc = guess - offsetMs(guess, timeZone);
  const adjusted = guess - offsetMs(utc, timeZone);
  return new Date(adjusted);
}

function addCivilDays(date: CivilDate, days: number): CivilDate {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

function sameCivil(a: CivilDate, b: CivilDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function civilDays(from: Date, toExclusive: Date): CivilDate[] {
  if (toExclusive.getTime() <= from.getTime()) return [];
  const days: CivilDate[] = [];
  let cursor: CivilDate = zonedParts(from);
  const end = zonedParts(new Date(toExclusive.getTime() - 1));
  for (let i = 0; i < 80; i += 1) {
    days.push(cursor);
    if (sameCivil(cursor, end)) break;
    cursor = addCivilDays(cursor, 1);
  }
  return days;
}

export function intervalsOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && startB < endA;
}

export function formatSlotDayLabel(start: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CONSULTATION_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(start);
}

export function formatSlotLabel(start: Date, end: Date): string {
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: CONSULTATION_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  });
  const endTime = new Intl.DateTimeFormat('en-US', {
    timeZone: CONSULTATION_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  return `${time.format(start)} - ${endTime.format(end)}`;
}

export function hourStarts(startIso: string, hours: number): string[] {
  const start = Date.parse(startIso);
  return Array.from({ length: hours }, (_, index) =>
    new Date(start + index * 3_600_000).toISOString(),
  );
}

/**
 * Open Consultation slots inside [from, to).
 * Weekdays only. Each slot is `hours` long and must end by 17:00 Eastern.
 * Busy and held intervals are half-open.
 */
export function enumerateConsultationSlots(input: {
  readonly from: Date;
  readonly to: Date;
  readonly now: Date;
  readonly hours: number;
  readonly busy?: readonly TimeInterval[];
  readonly holds?: readonly TimeInterval[];
  readonly leadMs?: number;
}): ConsultationSlot[] {
  const hours = input.hours;
  if (!Number.isInteger(hours) || hours < 1 || hours > 8) return [];
  const earliest = input.now.getTime() + (input.leadMs ?? CONSULTATION_LEAD_MS);
  const windowStart = input.from.getTime();
  const windowEnd = input.to.getTime();
  const blocked = [...(input.busy ?? []), ...(input.holds ?? [])]
    .map((interval) => ({ start: Date.parse(interval.start), end: Date.parse(interval.end) }))
    .filter((interval) => Number.isFinite(interval.start) && Number.isFinite(interval.end));

  const slots: ConsultationSlot[] = [];
  for (const day of civilDays(input.from, input.to)) {
    const noon = zonedTimeToUtc(day.year, day.month, day.day, 12, 0);
    const weekday = zonedParts(noon).weekday;
    if (weekday < 1 || weekday > 5) continue;
    for (
      let hour = CONSULTATION_DAY_START_HOUR;
      hour + hours <= CONSULTATION_DAY_END_HOUR;
      hour += 1
    ) {
      const start = zonedTimeToUtc(day.year, day.month, day.day, hour, 0);
      const end = new Date(start.getTime() + hours * 3_600_000);
      if (start.getTime() < earliest || start.getTime() < windowStart) continue;
      if (end.getTime() > windowEnd) continue;
      const hit = blocked.some((interval) =>
        intervalsOverlap(start.getTime(), end.getTime(), interval.start, interval.end),
      );
      if (hit) continue;
      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
        label: formatSlotLabel(start, end),
        dayLabel: formatSlotDayLabel(start),
      });
    }
  }
  return slots;
}

export function isOfferedConsultationSlot(input: {
  readonly start: string;
  readonly end: string;
  readonly hours: number;
  readonly now: Date;
  readonly busy?: readonly TimeInterval[];
  readonly holds?: readonly TimeInterval[];
}): boolean {
  const startMs = Date.parse(input.start);
  const endMs = Date.parse(input.end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return false;
  if (endMs !== startMs + input.hours * 3_600_000) return false;
  const slots = enumerateConsultationSlots({
    from: new Date(startMs - 24 * 3_600_000),
    to: new Date(endMs + 24 * 3_600_000),
    now: input.now,
    hours: input.hours,
    busy: input.busy,
    holds: input.holds,
  });
  return slots.some((slot) => Date.parse(slot.start) === startMs && Date.parse(slot.end) === endMs);
}

export function consultationCheckoutLines(input: {
  readonly hours: number;
  readonly stageB: boolean;
}): readonly CheckoutLine[] {
  const lines: CheckoutLine[] = [{ price: CONSULTATION_STRIPE_PRICE_ID, quantity: input.hours }];
  if (input.stageB) lines.push({ price: STAGE_B_STRIPE_PRICE_ID, quantity: 1 });
  return lines;
}

export function consultationCheckoutCents(hours: number, stageB: boolean): number {
  return consultationDueCents(hours) + (stageB ? STAGE_B_CENTS : 0);
}

export function consultationCheckoutMetadata(draft: CheckoutDraft): CheckoutMetadata {
  return {
    booking_id: draft.bookingId,
    start: draft.start,
    end: draft.end,
    hours: String(draft.hours),
    stage_b: draft.stageB ? 'true' : 'false',
    buyer_email: draft.buyerEmail,
    buyer_name: draft.buyerName,
    company: draft.company,
  };
}

export function redirectToCheckout(
  url: string,
  assign: (next: string) => void = (next) => {
    window.location.assign(next);
  },
): void {
  assign(url);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cleanBuyerName(value: string): string | null {
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 120) return null;
  if (/[\r\n]/.test(name)) return null;
  return name;
}

export function cleanBuyerEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (email.length > 200 || !EMAIL.test(email)) return null;
  return email;
}

export function cleanCompany(value: string): string | null {
  const company = value.trim().replace(/\s+/g, ' ');
  if (company.length > 160) return null;
  if (/[\r\n]/.test(company)) return null;
  return company;
}
