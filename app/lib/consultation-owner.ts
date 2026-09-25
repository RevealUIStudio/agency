/**
 * Owner notice after a paid Consultation.
 *
 * Plain text to founder@revealui.com only. The buyer is named in the body
 * and is not the recipient. Do not mount the product wordmark component.
 * Do not add a tagline, a second logo, or site nav.
 */

import type { Booking } from './consultation-booking';
import { consultationBookDueCents, consultationWhenLine } from './consultation-buyer';
import { formatUsdFromCents } from './money';
import { CONTACT_EMAIL } from './site';

export const OWNER_NOTIFY_EMAIL = CONTACT_EMAIL;

export const OWNER_PAID_SUBJECT = 'RevealUI Studio Consultation paid';

export interface OwnerPaidNotice {
  readonly to: typeof OWNER_NOTIFY_EMAIL;
  readonly subject: typeof OWNER_PAID_SUBJECT;
  readonly text: string;
  readonly bookingId: string;
  readonly buyerName: string;
  readonly buyerEmail: string;
  readonly when: string;
  readonly amountCents: number;
  readonly meetLink: string;
  readonly stageB: boolean;
  readonly network: boolean;
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/gu, ' ').trim();
}

/** Charged amount. Stripe `amount_total` wins. Otherwise Consultation, plus Stage B unless network. */
export function ownerPaidAmountCents(
  booking: Pick<Booking, 'hours' | 'stage_b' | 'stage_b_fee'>,
  amountTotal: number | null | undefined,
): number {
  if (typeof amountTotal === 'number' && Number.isInteger(amountTotal) && amountTotal >= 0) {
    return amountTotal;
  }
  return consultationBookDueCents(
    booking.hours,
    booking.stage_b,
    booking.stage_b_fee === 'waived_network',
  );
}

export function buildOwnerPaidNotice(
  booking: Booking,
  amountTotal: number | null | undefined,
): OwnerPaidNotice {
  const when = consultationWhenLine(booking.start, booking.end).replace(/^When: /u, '');
  const amountCents = ownerPaidAmountCents(booking, amountTotal);
  const meetLink =
    booking.meet_link && booking.meet_link.trim().length > 0
      ? oneLine(booking.meet_link)
      : 'The Google Meet link is on the calendar invite.';
  const stageB = booking.stage_b;
  const network = booking.stage_b_fee === 'waived_network';
  const text = [
    'RevealUI Studio Consultation paid.',
    '',
    `Buyer: ${oneLine(booking.name)}`,
    `Email: ${oneLine(booking.email)}`,
    `When: ${when}`,
    `Amount: ${formatUsdFromCents(amountCents)}`,
    `Google Meet: ${meetLink}`,
    `Booking: ${oneLine(booking.booking_id)}`,
    `Stage B: ${stageB ? 'yes' : 'no'}`,
    `Network: ${network ? 'yes' : 'no'}`,
  ].join('\n');
  return {
    to: OWNER_NOTIFY_EMAIL,
    subject: OWNER_PAID_SUBJECT,
    text,
    bookingId: booking.booking_id,
    buyerName: booking.name,
    buyerEmail: booking.email,
    when,
    amountCents,
    meetLink,
    stageB,
    network,
  };
}
