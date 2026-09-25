/**
 * Buyer-facing Consultation copy. The book page, the confirmation draft,
 * and the calendar invite share these sentences.
 *
 * Do not describe the domain pack as free, included, waived, or credited.
 * The Stripe SKU stays stage-b. The buyer invite is the calendar event.
 */

import { consultationDueCents, consultationHourCount } from './consultation-hours';
import { formatConsultationRange } from './consultation-slots';
import { STAGE_B_PRICE } from './engagements';
import { CONTACT_EMAIL } from './site';
import { STAGE_B_CENTS } from './stage-b-invoice';

export const CONSULTATION_BOOK_INTRO =
  'Weekday slots in Eastern Time, 9:00 AM to 5:00 PM. $300 per hour. The 30-minute intro stays a separate booking.';

export const STAGE_B_ADDON = `The domain pack is an optional ${STAGE_B_PRICE} add-on.`;

export const STAGE_B_CHECKBOX = `Add the domain pack (${STAGE_B_PRICE})`;

/** Network book link. The pack is on the order. Do not say the fee was removed. */
export const STAGE_B_ON_ORDER = 'Domain pack is on this order.';

export const STAGE_B_DETAIL =
  'Optional. Your share opens on a domain you already own, with the path note, proof-gap map, stack sketch, onboarding page, and a short walkthrough. We attach the DNS.';

export const CONSULTATION_HOLD_NOTE = 'Continuing to payment holds the slot for 20 minutes.';

export const CONSULTATION_AFTER_PAY =
  'After payment, the Google Meet link is on the calendar invite.';

export const CONSULTATION_SUCCESS =
  'Payment received. The Google Meet link is on the calendar invite.';

export const CONSULTATION_PREP_BODY =
  'Send the system you want to look at and the question you want answered. A link is usually enough.';

export const CONSULTATION_CANCEL = 'No charge. The hold ends within 20 minutes.';

export const CONSULTATION_READY_HINT = 'Pick a slot, then enter your name and email.';

export interface ConsultationReceipt {
  readonly label: string;
  readonly stageB: boolean;
}

const RECEIPT_STORAGE_KEY = 'consultation-receipt';

export function bookingIdFromCheckoutUrl(checkoutUrl: string): string {
  try {
    const parsed = new URL(checkoutUrl, 'https://revealuistudio.com');
    return parsed.searchParams.get('booking') ?? '';
  } catch {
    return '';
  }
}

/** Remember the slot for the success page after Stripe returns to this browser. */
export function rememberConsultationReceipt(bookingId: string, receipt: ConsultationReceipt): void {
  if (!bookingId || typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify({ bookingId, ...receipt }));
}

export function readConsultationReceipt(bookingId: string): ConsultationReceipt | null {
  if (!bookingId || typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(RECEIPT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const storedId =
      'bookingId' in parsed && typeof parsed.bookingId === 'string' ? parsed.bookingId : '';
    const label = 'label' in parsed && typeof parsed.label === 'string' ? parsed.label : '';
    const stageB = 'stageB' in parsed && parsed.stageB === true;
    if (storedId !== bookingId || label.length === 0) return null;
    return { label, stageB };
  } catch {
    return null;
  }
}

export function consultationEmptySlots(hours: number): string {
  const unit = hours === 1 ? 'hour' : 'hours';
  return `No open slots for ${hours} ${unit} in the next 3 weeks.`;
}

/** Due today. A network order keeps the pack on the Session and charges Consultation only. */
export function consultationBookDueCents(
  hours: number,
  stageB: boolean,
  packOnOrder: boolean,
): number {
  const consultation = consultationDueCents(consultationHourCount(hours));
  if (packOnOrder) return consultation;
  return consultation + (stageB ? STAGE_B_CENTS : 0);
}

export function consultationStageLine(stageB: boolean): string {
  if (stageB) return `The domain pack (${STAGE_B_PRICE}) is on this payment.`;
  return 'This payment is the consultation only.';
}

export function consultationWhenLine(start: string, end: string): string {
  return `When: ${formatConsultationRange(new Date(start), new Date(end))}`;
}

export function confirmationSubject(start: string, end: string): string {
  return `RevealUI Studio Consultation, ${formatConsultationRange(new Date(start), new Date(end))}`;
}

export function confirmationText(booking: {
  readonly start: string;
  readonly end: string;
  readonly company: string | null;
  readonly stage_b: boolean;
  readonly meet_link: string | null;
}): string {
  const meet = booking.meet_link ?? 'The Meet link is on the calendar invite.';
  const lines = [
    'Payment received for your RevealUI Studio Consultation.',
    '',
    consultationWhenLine(booking.start, booking.end),
    `Meet: ${meet}`,
  ];
  if (booking.company) lines.push(`Company: ${booking.company}`);
  lines.push(
    consultationStageLine(booking.stage_b),
    '',
    `Prep: ${CONSULTATION_PREP_BODY}`,
    `Questions: ${CONTACT_EMAIL}`,
  );
  return lines.join('\n');
}

/** Guest-visible calendar description. No internal desk notes. */
export function calendarInviteDescription(booking: {
  readonly start: string;
  readonly end: string;
  readonly company: string | null;
  readonly stage_b: boolean;
}): string {
  const lines = [consultationWhenLine(booking.start, booking.end)];
  if (booking.company) lines.push(`Company: ${booking.company}`);
  lines.push(
    consultationStageLine(booking.stage_b),
    `Prep: ${CONSULTATION_PREP_BODY}`,
    `Questions: ${CONTACT_EMAIL}`,
  );
  return lines.join('\n');
}
