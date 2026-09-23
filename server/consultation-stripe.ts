import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  type CheckoutDraft,
  type CheckoutLine,
  type CheckoutMetadata,
  consultationCheckoutLines,
  consultationCheckoutMetadata,
} from '../app/lib/consultation-book';

export interface CheckoutSessionResult {
  readonly id: string;
  readonly url: string;
}

export interface StripeGateway {
  createCheckout(input: {
    readonly draft: CheckoutDraft;
    readonly successUrl: string;
    readonly cancelUrl: string;
    readonly expiresAtSec: number;
  }): Promise<CheckoutSessionResult>;
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Stripe-Signature: `t=<unix>,v1=<hex>`. Tolerance is five minutes. */
export function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
  nowSec: number,
): boolean {
  let timestamp = '';
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === 't') timestamp = value;
    if (key === 'v1' && value) signatures.push(value);
  }
  const stamp = Number(timestamp);
  if (!timestamp || !Number.isFinite(stamp) || signatures.length === 0) return false;
  if (Math.abs(nowSec - stamp) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return signatures.some((signature) => safeEqual(signature, expected));
}

export function encodeCheckoutForm(input: {
  readonly draft: CheckoutDraft;
  readonly successUrl: string;
  readonly cancelUrl: string;
  readonly expiresAtSec: number;
  readonly lines?: readonly CheckoutLine[];
  readonly metadata?: CheckoutMetadata;
}): URLSearchParams {
  const lines =
    input.lines ??
    consultationCheckoutLines({
      hours: input.draft.hours,
      stageB: input.draft.stageB,
    });
  const metadata = input.metadata ?? consultationCheckoutMetadata(input.draft);
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('client_reference_id', input.draft.bookingId);
  params.set('success_url', input.successUrl);
  params.set('cancel_url', input.cancelUrl);
  params.set('customer_email', input.draft.buyerEmail);
  params.set('expires_at', String(input.expiresAtSec));
  lines.forEach((line, index) => {
    params.set(`line_items[${index}][price]`, line.price);
    params.set(`line_items[${index}][quantity]`, String(line.quantity));
  });
  for (const [key, value] of Object.entries(metadata)) {
    params.set(`metadata[${key}]`, value);
  }
  return params;
}

export class StripeCheckout implements StripeGateway {
  constructor(
    private readonly secretKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async createCheckout(input: {
    readonly draft: CheckoutDraft;
    readonly successUrl: string;
    readonly cancelUrl: string;
    readonly expiresAtSec: number;
  }): Promise<CheckoutSessionResult> {
    const params = encodeCheckoutForm(input);
    const response = await this.fetchImpl('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.secretKey}`,
        'content-type': 'application/x-www-form-urlencoded',
        'idempotency-key': input.draft.bookingId,
      },
      body: params,
    });
    if (!response.ok) throw new Error('checkout');
    const payload = (await response.json()) as { id?: string; url?: string | null };
    if (!payload.id || !payload.url) throw new Error('checkout');
    return { id: payload.id, url: payload.url };
  }
}

/** Local booker only. Sends the buyer to the success page without charging. */
export class FixtureStripe implements StripeGateway {
  async createCheckout(input: {
    readonly draft: CheckoutDraft;
    readonly successUrl: string;
    readonly cancelUrl: string;
    readonly expiresAtSec: number;
  }): Promise<CheckoutSessionResult> {
    return { id: `cs_fixture_${input.draft.bookingId}`, url: input.successUrl };
  }
}
