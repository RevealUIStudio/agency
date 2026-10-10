/**
 * Stripe Checkout over REST and webhook signature checks.
 * Web Crypto only, so the edge runtime does not need a Stripe SDK.
 */

import { z } from 'zod';
import type { Booking } from '../app/lib/consultation-booking';
import { type CheckoutLine, encodeCheckoutForm } from '../app/lib/consultation-checkout';
import { providerFetch } from './provider-http';

const TOLERANCE_MS = 5 * 60 * 1000;

export interface StripePort {
  createCheckout(input: {
    readonly booking: Booking;
    readonly lines: readonly CheckoutLine[];
    readonly successUrl: string;
    readonly cancelUrl: string;
    readonly stageBNetworkCouponId?: string;
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
  const response = await providerFetch(
    'https://api.stripe.com/v1/checkout/sessions',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${input.secretKey}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: input.formBody,
    },
    fetchImpl,
  );
  if (!response.ok) throw new Error(`stripe-checkout:${response.status}`);
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object') throw new Error('stripe-checkout:missing-url');
  const id = 'id' in payload && typeof payload.id === 'string' ? payload.id : '';
  const url = 'url' in payload && typeof payload.url === 'string' ? payload.url : '';
  if (!id || !url) throw new Error('stripe-checkout:missing-url');
  return { id, url };
}

/** Retrieve current provider truth; a signed event can still be stale or reordered. */
export async function refundedCheckoutFromStripe(
  secretKey: string | undefined,
  chargeId: string,
  fetchImpl: typeof fetch = fetch,
) {
  if (!secretKey || !/^ch_[a-zA-Z0-9]+$/.test(chargeId))
    throw new Error('stripe-refund-unconfigured');
  const get = async (path: string) => {
    const response = await providerFetch(
      `https://api.stripe.com/v1${path}`,
      {
        headers: { authorization: `Bearer ${secretKey}` },
      },
      fetchImpl,
    );
    if (!response.ok) throw new Error('stripe-refund-unavailable');
    return response.json();
  };
  const charge = z
    .object({
      id: z.literal(chargeId),
      payment_intent: z.string().regex(/^pi_[a-zA-Z0-9]+$/),
      amount: z.number().int().positive(),
      amount_refunded: z.number().int().nonnegative(),
      currency: z.literal('usd'),
    })
    .parse(await get(`/charges/${encodeURIComponent(chargeId)}`));
  if (charge.amount_refunded > charge.amount) throw new Error('stripe-refund-invalid');
  const refundSchema = z.object({
    id: z.string().regex(/^re_[a-zA-Z0-9]+$/),
    charge: z.literal(chargeId),
    amount: z.number().int().positive(),
    currency: z.literal('usd'),
    status: z.string(),
  });
  const refunds: z.infer<typeof refundSchema>[] = [];
  const refundIds = new Set<string>();
  let cursor = '';
  for (let page = 0; page < 10; page += 1) {
    const query = new URLSearchParams({ charge: chargeId, limit: '100' });
    if (cursor) query.set('starting_after', cursor);
    const result = z
      .object({ has_more: z.boolean(), data: z.array(refundSchema) })
      .parse(await get(`/refunds?${query}`));
    for (const refund of result.data) {
      if (refundIds.has(refund.id)) throw new Error('stripe-refund-invalid');
      refundIds.add(refund.id);
      refunds.push(refund);
    }
    if (!result.has_more) break;
    const last = result.data.at(-1);
    if (!last || page === 9) throw new Error('stripe-refund-incomplete');
    cursor = last.id;
  }
  const succeeded = refunds.filter((refund) => refund.status === 'succeeded');
  const refunded = succeeded.reduce((sum, refund) => sum + refund.amount, 0);
  if (!refunded) return null;
  if (
    !Number.isSafeInteger(refunded) ||
    refunded > charge.amount_refunded ||
    refunded > charge.amount
  )
    throw new Error('stripe-refund-invalid');
  const result = z
    .object({
      has_more: z.literal(false),
      data: z.array(
        z.object({
          id: z.string(),
          mode: z.string(),
          payment_status: z.string(),
          payment_intent: z.string().nullable(),
          amount_total: z.number().nullable(),
          metadata: z.record(z.string(), z.string()).nullable(),
        }),
      ),
    })
    .parse(
      await get(
        `/checkout/sessions?payment_intent=${encodeURIComponent(charge.payment_intent)}&limit=100`,
      ),
    );
  const sessions = result.data.filter(
    (session) =>
      session.mode === 'payment' &&
      session.payment_status === 'paid' &&
      session.payment_intent === charge.payment_intent &&
      session.metadata?.booking_id,
  );
  if (!sessions.length) return null;
  if (sessions.length !== 1) throw new Error('stripe-refund-ambiguous');
  const session = sessions[0];
  if (!session || session.amount_total !== charge.amount || !session.id.startsWith('cs_'))
    throw new Error('stripe-refund-binding');
  return {
    bookingId: session.metadata?.booking_id ?? '',
    stripeSessionId: session.id,
    chargeId,
    amountRefunded: refunded,
    full: refunded === charge.amount,
  };
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
        stageBFee: input.booking.stage_b_fee,
        stageBNetworkCouponId: input.stageBNetworkCouponId,
        networkJti: input.booking.network_jti,
        buyerEmail: input.booking.email,
        buyerName: input.booking.name,
        company: input.booking.company,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      });
      return createStripeCheckout({ secretKey: secret, formBody, fetchImpl });
    },
  };
}
