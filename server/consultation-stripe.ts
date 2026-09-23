/**
 * Stripe Checkout over REST and webhook signature checks.
 * Web Crypto only, so the edge runtime does not need a Stripe SDK.
 */

import type { Booking } from '../app/lib/consultation-booking';
import { type CheckoutLine, encodeCheckoutForm } from '../app/lib/consultation-checkout';

const TOLERANCE_MS = 5 * 60 * 1000;

export interface StripePort {
  createCheckout(input: {
    readonly booking: Booking;
    readonly lines: readonly CheckoutLine[];
    readonly successUrl: string;
    readonly cancelUrl: string;
  }): Promise<{ readonly id: string; readonly url: string }>;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  const length = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < length; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return bytesToHex(new Uint8Array(mac));
}

/** Test helper. The header covers `${timestamp}.${rawBody}`. */
export async function stripeSignatureHeader(
  secret: string,
  rawBody: string,
  timestamp: number,
): Promise<string> {
  const hex = await hmacHex(secret, `${timestamp}.${rawBody}`);
  return `t=${timestamp},v1=${hex}`;
}

export async function verifyStripeSignature(
  secret: string,
  rawBody: string,
  header: string,
  nowMs: number,
): Promise<boolean> {
  if (!secret || !header) return false;
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const key = part.slice(0, eq);
    const value = part.slice(eq + 1);
    if (key === 't') {
      const parsed = Number(value);
      timestamp = Number.isFinite(parsed) ? parsed : null;
    } else if (key === 'v1' && value) {
      signatures.push(value);
    }
  }
  if (timestamp === null || signatures.length === 0) return false;
  if (Math.abs(nowMs - timestamp * 1000) > TOLERANCE_MS) return false;
  const expected = await hmacHex(secret, `${timestamp}.${rawBody}`);
  return signatures.some((signature) => timingSafeEqual(signature, expected));
}

export async function createStripeCheckout(input: {
  readonly secretKey: string;
  readonly formBody: string;
  readonly fetchImpl?: typeof fetch;
}): Promise<{ id: string; url: string }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.secretKey}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: input.formBody,
  });
  if (!response.ok) throw new Error(`stripe-checkout:${response.status}`);
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object') throw new Error('stripe-checkout:missing-url');
  const id = 'id' in payload && typeof payload.id === 'string' ? payload.id : '';
  const url = 'url' in payload && typeof payload.url === 'string' ? payload.url : '';
  if (!id || !url) throw new Error('stripe-checkout:missing-url');
  return { id, url };
}

export function stripeFromEnv(
  secretKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
): StripePort | null {
  if (!secretKey) return null;
  const secret = secretKey;
  return {
    async createCheckout(input) {
      const formBody = encodeCheckoutForm({
        lines: input.lines,
        bookingId: input.booking.booking_id,
        start: input.booking.start,
        end: input.booking.end,
        hours: input.booking.hours,
        stageB: input.booking.stage_b,
        buyerEmail: input.booking.email,
        buyerName: input.booking.name,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      });
      return createStripeCheckout({ secretKey: secret, formBody, fetchImpl });
    },
  };
}
