/**
 * Stripe Checkout line items for a Consultation.
 *
 * Stage B is an optional paid add-on. This module has no credit and no waive
 * input. Network credits stay on the invoice endpoint.
 */

import { consultationDueCents } from './consultation-hours';

/** Live Consultation price. $300 per hour. Override with STRIPE_CONSULTATION_PRICE_ID. */
export const DEFAULT_CONSULTATION_PRICE_ID = 'price_1TxpQTJz64n6uEibitNE5eJP' as const;

/** Live Stage B price. $297 once. Override with STRIPE_STAGE_B_PRICE_ID. */
export const DEFAULT_STAGE_B_PRICE_ID = 'price_1UIjpPJz64n6uEibxJOYKJ3t' as const;

export interface CheckoutLine {
  readonly price: string;
  readonly quantity: number;
}

export function consultationCheckoutLines(input: {
  readonly hours: number;
  readonly stageB: boolean;
  readonly consultationPriceId?: string;
  readonly stageBPriceId?: string;
}): readonly CheckoutLine[] {
  const hours = input.hours;
  consultationDueCents(hours);
  const lines: CheckoutLine[] = [
    {
      price: input.consultationPriceId || DEFAULT_CONSULTATION_PRICE_ID,
      quantity: hours,
    },
  ];
  if (input.stageB) {
    lines.push({
      price: input.stageBPriceId || DEFAULT_STAGE_B_PRICE_ID,
      quantity: 1,
    });
  }
  return lines;
}

export function encodeCheckoutForm(input: {
  readonly lines: readonly CheckoutLine[];
  readonly bookingId: string;
  readonly start: string;
  readonly end: string;
  readonly hours: number;
  readonly stageB: boolean;
  readonly buyerEmail: string;
  readonly buyerName: string;
  readonly successUrl: string;
  readonly cancelUrl: string;
}): string {
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('client_reference_id', input.bookingId);
  params.set('success_url', input.successUrl);
  params.set('cancel_url', input.cancelUrl);
  params.set('customer_email', input.buyerEmail);
  input.lines.forEach((line, index) => {
    params.set(`line_items[${index}][price]`, line.price);
    params.set(`line_items[${index}][quantity]`, String(line.quantity));
  });
  const metadata: Record<string, string> = {
    booking_id: input.bookingId,
    start: input.start,
    end: input.end,
    hours: String(input.hours),
    stage_b: input.stageB ? 'true' : 'false',
    buyer_email: input.buyerEmail,
    buyer_name: input.buyerName.slice(0, 200),
  };
  for (const [key, value] of Object.entries(metadata)) {
    params.set(`metadata[${key}]`, value);
  }
  return params.toString();
}
