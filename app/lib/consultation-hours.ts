import { formatUsdFromCents } from './money';

/** One Consultation is $300. The dropdown multiplies that unit. It is not a separate SKU. */
export const CONSULTATION_UNIT_CENTS = 30_000 as const;

export const CONSULTATION_HOUR_MIN = 1 as const;
export const CONSULTATION_HOUR_MAX = 8 as const;
export const DEFAULT_CONSULTATION_HOURS = 1 as const;

export const CONSULTATION_HOUR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function consultationHourCount(hours: number): number {
  if (!Number.isInteger(hours) || hours < CONSULTATION_HOUR_MIN || hours > CONSULTATION_HOUR_MAX) {
    return DEFAULT_CONSULTATION_HOURS;
  }
  return hours;
}

/** Server pricing. Rejects a count outside 1–8 instead of silently clamping. */
export function consultationDueCents(hours: number): number {
  if (!Number.isInteger(hours) || hours < CONSULTATION_HOUR_MIN || hours > CONSULTATION_HOUR_MAX) {
    throw new RangeError('consultation-hours');
  }
  return CONSULTATION_UNIT_CENTS * hours;
}

export function consultationHourLabel(hours: number): string {
  const count = consultationHourCount(hours);
  const unit = count === 1 ? 'hour' : 'hours';
  return `${count} ${unit} · ${formatUsdFromCents(consultationDueCents(count))}`;
}
