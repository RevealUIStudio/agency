/**
 * Weekday Consultation slots in America/New_York.
 *
 * 09:00–17:00, 60-minute steps. A multi-hour booking is contiguous steps that
 * still end by 17:00. Busy intervals and unexpired holds are excluded.
 */

export const CONSULTATION_TZ = 'America/New_York' as const;
export const SLOT_STEP_MINUTES = 60 as const;
export const DAY_START_MINUTES = 9 * 60;
export const DAY_END_MINUTES = 17 * 60;
export const HOLD_TTL_MS = 20 * 60 * 1000;
export const MAX_SLOT_WINDOW_MS = 62 * 24 * 60 * 60 * 1000;

const WEEKDAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

export interface TimeInterval {
  readonly start: string;
  readonly end: string;
}

export interface HeldInterval extends TimeInterval {
  readonly expiresAt: string;
}

export interface ConsultationSlot extends TimeInterval {
  readonly label: string;
}

interface Ymd {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

interface ZonedParts extends Ymd {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly weekday: string;
}

function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
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
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(instant)) {
    if (part.type !== 'literal') bag[part.type] = part.value;
  }
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
    weekday: bag.weekday ?? '',
  };
}

function tzOffsetMs(instant: Date, timeZone: string): number {
  const parts = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - instant.getTime();
}

/** Wall-clock time in `timeZone` as a UTC instant. */
export function zonedWallToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string = CONSULTATION_TZ,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset1 = tzOffsetMs(new Date(guess), timeZone);
  let utc = guess - offset1;
  const offset2 = tzOffsetMs(new Date(utc), timeZone);
  if (offset2 !== offset1) utc = guess - offset2;
  return new Date(utc);
}

function etYmd(instant: Date): Ymd {
  const parts = zonedParts(instant, CONSULTATION_TZ);
  return { year: parts.year, month: parts.month, day: parts.day };
}

function compareYmd(a: Ymd, b: Ymd): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

function nextYmd(ymd: Ymd): Ymd {
  const next = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day + 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

function overlaps(startMs: number, endMs: number, interval: TimeInterval): boolean {
  const otherStart = Date.parse(interval.start);
  const otherEnd = Date.parse(interval.end);
  if (!Number.isFinite(otherStart) || !Number.isFinite(otherEnd)) return false;
  return startMs < otherEnd && otherStart < endMs;
}

/** Buyer-facing Eastern Time range. Same string the book page shows on each slot. */
export function formatConsultationRange(start: Date, end: Date): string {
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone: CONSULTATION_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(start);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: CONSULTATION_TZ,
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${date} · ${time.format(start)}–${time.format(end)} ET`;
}

export function generateConsultationSlots(input: {
  readonly from: Date;
  readonly to: Date;
  readonly now: Date;
  readonly hours: number;
  readonly busy?: readonly TimeInterval[];
  readonly holds?: readonly HeldInterval[];
}): ConsultationSlot[] {
  const hours = input.hours;
  if (!Number.isInteger(hours) || hours < 1) return [];
  const durationMinutes = hours * SLOT_STEP_MINUTES;
  let to = input.to;
  if (to.getTime() - input.from.getTime() > MAX_SLOT_WINDOW_MS) {
    to = new Date(input.from.getTime() + MAX_SLOT_WINDOW_MS);
  }
  if (!(to.getTime() > input.from.getTime())) return [];

  const activeHolds = (input.holds ?? []).filter(
    (hold) => Date.parse(hold.expiresAt) > input.now.getTime(),
  );
  const blocked = [...(input.busy ?? []), ...activeHolds];

  const slots: ConsultationSlot[] = [];
  const lastDay = etYmd(new Date(to.getTime() - 1));
  for (let day = etYmd(input.from); compareYmd(day, lastDay) <= 0; day = nextYmd(day)) {
    const noon = zonedWallToUtc(day.year, day.month, day.day, 12, 0);
    if (!WEEKDAYS.has(zonedParts(noon, CONSULTATION_TZ).weekday)) continue;

    for (
      let minute = DAY_START_MINUTES;
      minute + durationMinutes <= DAY_END_MINUTES;
      minute += SLOT_STEP_MINUTES
    ) {
      const start = zonedWallToUtc(day.year, day.month, day.day, Math.floor(minute / 60), 0);
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      if (start.getTime() <= input.now.getTime()) continue;
      if (start.getTime() < input.from.getTime() || end.getTime() > to.getTime()) continue;
      if (blocked.some((interval) => overlaps(start.getTime(), end.getTime(), interval))) continue;
      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
        label: formatConsultationRange(start, end),
      });
    }
  }
  return slots;
}
