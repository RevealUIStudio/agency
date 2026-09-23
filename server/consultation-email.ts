import { consultationCheckoutCents } from '../app/lib/consultation-book';
import { formatUsdFromCents } from '../app/lib/money';
import type { ConsultationBooking } from './consultation-store';

/**
 * Confirm-email payload. Resend is not wired in this repo.
 * `send` stays false. Do not deliver this from the webhook.
 */
export interface ConsultationConfirmEmail {
  readonly send: false;
  readonly bookingId: string;
  readonly to: string;
  readonly subject: string;
  readonly appointmentStart: string;
  readonly appointmentEnd: string;
  readonly meetLink: string;
  readonly paymentNote: string;
  readonly prep: string;
}

export function buildConsultationConfirmEmail(
  booking: ConsultationBooking,
  meetLink: string,
): ConsultationConfirmEmail {
  const amount = formatUsdFromCents(consultationCheckoutCents(booking.hours, booking.stageB));
  const stage = booking.stageB ? ' Stage B is included in that amount.' : '';
  return {
    send: false,
    bookingId: booking.id,
    to: booking.email,
    subject: 'Your RevealUI Studio Consultation',
    appointmentStart: booking.start,
    appointmentEnd: booking.end,
    meetLink,
    paymentNote: `Payment received: ${amount}.${stage}`,
    prep: 'Bring the critical path, what is live today, and the decision you want from the session.',
  };
}
