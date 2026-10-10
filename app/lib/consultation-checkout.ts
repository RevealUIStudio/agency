/**
 * Stripe Checkout line items for a Consultation.
 *
 * Strangers can add Stage B at list price. A network book link puts Stage B
 * on the Session and zeroes that line with a coupon. This module never adds
 * a negative line item.
 */

import type { StageBFee } from './consultation-booking';
import { CONSULTATION_UNIT_CENTS, consultationDueCents } from './consultation-hours';
import { DOMAIN_ADD_ON_LABEL } from './domain-pack';
import { CONSULTATION, CONSULTATION_PRICE, STAGE_B_CENTS, STAGE_B_PRICE } from './engagements';

/** Live Consultation price. $300 per hour. Override with STRIPE_CONSULTATION_PRICE_ID. */
export const DEFAULT_CONSULTATION_PRICE_ID = 'price_1TxpQTJz64n6uEibitNE5eJP' as const;

/** Live Stage B price. $297 once. Override with STRIPE_STAGE_B_PRICE_ID. */
export const DEFAULT_STAGE_B_PRICE_ID = 'price_1UIjpPJz64n6uEibxJOYKJ3t' as const;

/**
 * Live Adapter price. $2,497 once. Lookup key `studio_adapter`.
 * Not a Consultation Checkout line. The Stripe product id stays in Stripe.
 */
export const DEFAULT_ADAPTER_PRICE_ID = 'price_1UJqwUJz64n6uEibb00OrqFM' as const;
export const ADAPTER_LOOKUP_KEY = 'studio_adapter' as const;

/**
 * Collect a billing address only when the payment method or tax needs one.
 * automatic_tax stays off; this does not turn tax on.
 */
export const CHECKOUT_BILLING_ADDRESS_COLLECTION = 'auto' as const;

/** Groups Consultation Checkout Sessions. Stripe allows letters, digits, `_`, `-`, `.`. */
export const INTEGRATION_IDENTIFIER_PREFIX = 'consultation_book_' as const;

/** Suffix length in the `consultation_book_XXXXXXXX` identifier. Letters only. */
export const INTEGRATION_IDENTIFIER_SUFFIX_LENGTH = 8;

const INTEGRATION_SUFFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

export function consultationIntegrationIdentifier(
  suffix = randomIntegrationSuffix(INTEGRATION_IDENTIFIER_SUFFIX_LENGTH),
): string {
  return `${INTEGRATION_IDENTIFIER_PREFIX}${suffix}`;
}

function randomIntegrationSuffix(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let suffix = '';
  for (const byte of bytes) {
    suffix += INTEGRATION_SUFFIX_ALPHABET[byte % INTEGRATION_SUFFIX_ALPHABET.length] ?? 'a';
  }
  return suffix;
}

export interface CheckoutProductData {
  readonly name: string;
  readonly description: string;
}

export interface CheckoutPriceData {
  readonly currency: 'usd';
  readonly unitAmount: number;
  readonly productData: CheckoutProductData;
}

/** Inline price, so Checkout shows this name instead of the Stripe Product record. */
export interface CheckoutPriceDataLine {
  readonly quantity: number;
  readonly priceData: CheckoutPriceData;
}

/**
 * Existing Stripe Price. Used only when a product-restricted network coupon
 * must apply to the domain add-on. Paid Checkout uses price_data instead.
 */
export interface CheckoutPriceIdLine {
  readonly quantity: number;
  readonly price: string;
}

export type CheckoutLine = CheckoutPriceDataLine | CheckoutPriceIdLine;

export function consultationCheckoutDescription(hours: number): string {
  const unit = hours === 1 ? 'hour' : 'hours';
  return `${CONSULTATION_PRICE} per hour, ${hours} ${unit}`;
}

export function domainAddOnCheckoutDescription(): string {
  return `Custom domain setup, ${STAGE_B_PRICE}. Included at Pilot and Launch.`;
}

export function consultationPriceDataLine(hours: number): CheckoutPriceDataLine {
  return {
    quantity: hours,
    priceData: {
      currency: 'usd',
      unitAmount: CONSULTATION_UNIT_CENTS,
      productData: {
        name: CONSULTATION.name,
        description: consultationCheckoutDescription(hours),
      },
    },
  };
}

export function domainAddOnPriceDataLine(): CheckoutPriceDataLine {
  return {
    quantity: 1,
    priceData: {
      currency: 'usd',
      unitAmount: STAGE_B_CENTS,
      productData: {
        name: DOMAIN_ADD_ON_LABEL,
        description: domainAddOnCheckoutDescription(),
      },
    },
  };
}

function refuseAdapterOnConsultationCheckout(price: string): void {
  if (price === DEFAULT_ADAPTER_PRICE_ID) {
    throw new Error('adapter-not-on-consultation-checkout');
  }
}

export function consultationCheckoutLines(input: {
  readonly hours: number;
  readonly stageB: boolean;
  readonly stageBFee?: StageBFee;
  readonly consultationPriceId?: string;
  readonly stageBPriceId?: string;
}): readonly CheckoutLine[] {
  const hours = input.hours;
  consultationDueCents(hours);
  const consultationPrice = input.consultationPriceId || DEFAULT_CONSULTATION_PRICE_ID;
  const stageBPrice = input.stageBPriceId || DEFAULT_STAGE_B_PRICE_ID;
  refuseAdapterOnConsultationCheckout(consultationPrice);
  if (input.stageB) refuseAdapterOnConsultationCheckout(stageBPrice);
  const fee: StageBFee = input.stageBFee ?? (input.stageB ? 'paid_addon' : 'none');
  const lines: CheckoutLine[] = [consultationPriceDataLine(hours)];
  if (input.stageB && fee === 'waived_network') {
    lines.push({
      price: stageBPrice,
      quantity: 1,
    });
  } else if (input.stageB) {
    lines.push(domainAddOnPriceDataLine());
  }
  return lines;
}

export class CheckoutDiscountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutDiscountError';
  }
}

export function encodeCheckoutForm(input: {
  readonly lines: readonly CheckoutLine[];
  readonly bookingId: string;
  readonly start: string;
  readonly end: string;
  readonly hours: number;
  readonly stageB: boolean;
  readonly stageBFee?: StageBFee;
  readonly stageBNetworkCouponId?: string;
  readonly networkJti?: string | null;
  readonly buyerEmail: string;
  readonly buyerName: string;
  readonly company?: string | null;
  readonly successUrl: string;
  readonly cancelUrl: string;
  readonly integrationIdentifier?: string;
}): string {
  const stageBFee: StageBFee = input.stageBFee ?? (input.stageB ? 'paid_addon' : 'none');
  if (stageBFee === 'waived_network') {
    if (!input.stageB || input.lines.length < 2) {
      throw new CheckoutDiscountError('stage-b-required');
    }
    const coupon = input.stageBNetworkCouponId?.trim() ?? '';
    if (!coupon) throw new CheckoutDiscountError('network-coupon-missing');
  }

  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('client_reference_id', input.bookingId);
  params.set('success_url', input.successUrl);
  params.set('cancel_url', input.cancelUrl);
  if (input.buyerEmail) params.set('customer_email', input.buyerEmail);
  // Omit payment_method_types so Dashboard dynamic methods (Link, Apple Pay,
  // Google Pay) can surface. A card-only list hides them.
  // Omit ui_mode (hosted Checkout stays the default) and automatic_tax.
  params.set('phone_number_collection[enabled]', 'true');
  params.set('billing_address_collection', CHECKOUT_BILLING_ADDRESS_COLLECTION);
  params.set(
    'integration_identifier',
    input.integrationIdentifier ?? consultationIntegrationIdentifier(),
  );
  input.lines.forEach((line, index) => {
    params.set(`line_items[${index}][quantity]`, String(line.quantity));
    if ('priceData' in line) {
      params.set(`line_items[${index}][price_data][currency]`, line.priceData.currency);
      params.set(
        `line_items[${index}][price_data][unit_amount]`,
        String(line.priceData.unitAmount),
      );
      params.set(
        `line_items[${index}][price_data][product_data][name]`,
        line.priceData.productData.name,
      );
      params.set(
        `line_items[${index}][price_data][product_data][description]`,
        line.priceData.productData.description,
      );
      return;
    }
    params.set(`line_items[${index}][price]`, line.price);
  });
  if (stageBFee === 'waived_network') {
    params.set('discounts[0][coupon]', input.stageBNetworkCouponId?.trim() ?? '');
  }
  const metadata: Record<string, string> = {
    booking_id: input.bookingId,
    start: input.start,
    end: input.end,
    hours: String(input.hours),
    stage_b: stageBFee === 'waived_network' || input.stageB ? 'true' : 'false',
    stage_b_fee: stageBFee,
    buyer_email: input.buyerEmail,
    buyer_name: input.buyerName.slice(0, 200),
  };
  if (stageBFee === 'waived_network' && input.networkJti) {
    metadata.network_jti = input.networkJti;
  }
  const company = input.company?.trim();
  if (company) metadata.company = company.slice(0, 160);
  for (const [key, value] of Object.entries(metadata)) {
    params.set(`metadata[${key}]`, value);
  }
  return params.toString();
}
