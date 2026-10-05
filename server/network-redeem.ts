/**
 * Single-use ledger for a signed network Consultation link.
 *
 * Storage is the same calendar record store as slot holds. Tests use the
 * memory adapter. Production uses one calendar event per jti. The event id
 * is derived from the jti, so a second insert conflicts. The event sits on a
 * fixed carrier time and does not occupy a Consultation slot or create a
 * Google Meet link.
 *
 * Rule:
 * 1. Verify the signature, the expiry, and any email binding before this ledger.
 * 2. Insert the jti if it is absent before creating Checkout.
 * 3. Write the durable claim only when Checkout Session creation succeeds.
 *    The row stores the jti, the buyer email, the session id, the checkout URL,
 *    the booking id, when the session stops counting as open, and expires_at
 *    copied from the token.
 * 4. While that session is open, the same jti and the same email receive that
 *    same session again. A Checkout Session counts as open for 24 hours after
 *    creation, or until the token expires, whichever is sooner.
 * 5. Any other second redemption is rejected. The claim still blocks a new
 *    session until the token expiry.
 * 6. If Checkout creation fails before a session exists, release the
 *    reservation so the buyer can retry. A reservation with no session also
 *    lapses after two minutes so a crashed attempt does not stick.
 * 7. The claim expires with the token TTL.
 */

import { type ConsultationEnv, googleAccessToken } from './consultation-calendar';
import { providerFetch } from './provider-http';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
const KIND = 'studio-network-redeem';
const EVENT_ID_ALPHABET = '0123456789abcdefghijklmnopqrstuv';

/** Stripe does not keep a Checkout Session open longer than this. */
export const NETWORK_CHECKOUT_SESSION_MAX_MS = 24 * 60 * 60 * 1000;

/** A reservation with no session lapses so a crashed attempt can be retried. */
export const NETWORK_CLAIM_LEASE_MS = 2 * 60 * 1000;

/**
 * Carrier time for the calendar row. Weekday Consultation slots are never
 * in 2000, and hold conflict checks are windowed on the booked hour.
 */
const REDEEM_EVENT_START = '2000-01-01T00:00:00.000Z';
const REDEEM_EVENT_END = '2000-01-01T00:05:00.000Z';

export type NetworkClaimStatus = 'pending' | 'open' | 'paid' | 'released';

export interface NetworkClaim {
  readonly jti: string;
  readonly email: string;
  readonly status: NetworkClaimStatus;
  readonly expiresAt: string;
  readonly leaseUntil: string;
  readonly stripeSessionId: string | null;
  readonly checkoutUrl: string | null;
  readonly bookingId: string | null;
  readonly sessionExpiresAt: string | null;
}

export interface ReserveInput {
  readonly jti: string;
  readonly email: string;
  readonly expiresAt: Date;
  readonly now: Date;
}

export interface CommitInput {
  readonly jti: string;
  readonly email: string;
  readonly now: Date;
  readonly expiresAt: Date;
  readonly stripeSessionId: string;
  readonly checkoutUrl: string;
  readonly bookingId: string;
}

export type ReserveResult =
  | { readonly outcome: 'reserved' }
  | { readonly outcome: 'rejected' }
  | {
      readonly outcome: 'reuse';
      readonly bookingId: string;
      readonly checkoutUrl: string;
      readonly stripeSessionId: string;
    };

export type CommitResult = 'committed' | 'reused' | 'rejected';

export type ReservePlan =
  | { readonly kind: 'insert' }
  | { readonly kind: 'replace' }
  | { readonly kind: 'reject' }
  | { readonly kind: 'reuse'; readonly claim: NetworkClaim };

export interface NetworkRedeemLedger {
  reserve(input: ReserveInput): Promise<ReserveResult>;
  commit(input: CommitInput): Promise<CommitResult>;
  /** Drop a reservation that never received a Checkout Session. */
  release(jti: string): Promise<void>;
  /** Payment closes the session. A later book call is a second redemption. */
  markPaid(jti: string): Promise<void>;
  get(jti: string): Promise<NetworkClaim | null>;
}

export async function networkRedeemEventId(jti: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`studio-network-redeem:${jti}`)),
  );
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of digest) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += EVENT_ID_ALPHABET[(buffer >> bits) & 31] ?? '0';
    }
    buffer &= (1 << bits) - 1;
  }
  if (bits > 0) out += EVENT_ID_ALPHABET[(buffer << (5 - bits)) & 31] ?? '0';
  return out;
}

function pendingClaim(input: ReserveInput): NetworkClaim {
  return {
    jti: input.jti,
    email: input.email,
    status: 'pending',
    expiresAt: input.expiresAt.toISOString(),
    leaseUntil: new Date(input.now.getTime() + NETWORK_CLAIM_LEASE_MS).toISOString(),
    stripeSessionId: null,
    checkoutUrl: null,
    bookingId: null,
    sessionExpiresAt: null,
  };
}

function sessionStillOpen(claim: NetworkClaim, now: Date): boolean {
  if (claim.status !== 'open') return false;
  if (!claim.stripeSessionId || !claim.checkoutUrl || !claim.bookingId || !claim.sessionExpiresAt) {
    return false;
  }
  const until = Date.parse(claim.sessionExpiresAt);
  return Number.isFinite(until) && until > now.getTime();
}

function reuseOf(claim: NetworkClaim): ReserveResult {
  return {
    outcome: 'reuse',
    bookingId: claim.bookingId ?? '',
    checkoutUrl: claim.checkoutUrl ?? '',
    stripeSessionId: claim.stripeSessionId ?? '',
  };
}

/** Decide the insert-if-absent step. Pure so the memory and calendar adapters match. */
export function planReserve(existing: NetworkClaim | null, input: ReserveInput): ReservePlan {
  if (!existing) return { kind: 'insert' };
  const now = input.now.getTime();
  const expiresAt = Date.parse(existing.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return { kind: 'replace' };
  if (existing.status === 'released') return { kind: 'replace' };
  if (existing.status === 'paid') return { kind: 'reject' };
  if (existing.status === 'open') {
    if (existing.email === input.email && sessionStillOpen(existing, input.now)) {
      return { kind: 'reuse', claim: existing };
    }
    return { kind: 'reject' };
  }
  const leaseUntil = Date.parse(existing.leaseUntil);
  if (Number.isFinite(leaseUntil) && leaseUntil > now) return { kind: 'reject' };
  return { kind: 'replace' };
}

export function nextClaimOnCommit(
  existing: NetworkClaim | null,
  input: CommitInput,
): NetworkClaim | 'reuse' | 'reject' {
  if (!existing) return 'reject';
  const now = input.now.getTime();
  const expiresAt = Date.parse(existing.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return 'reject';
  if (existing.status === 'paid' || existing.status === 'released') return 'reject';
  if (existing.email !== input.email) return 'reject';
  if (existing.status === 'open') {
    if (
      existing.stripeSessionId === input.stripeSessionId &&
      sessionStillOpen(existing, input.now)
    ) {
      return 'reuse';
    }
    return 'reject';
  }
  const sessionExpiresAt = new Date(
    Math.min(expiresAt, now + NETWORK_CHECKOUT_SESSION_MAX_MS),
  ).toISOString();
  return {
    ...existing,
    status: 'open',
    email: input.email,
    expiresAt: input.expiresAt.toISOString(),
    stripeSessionId: input.stripeSessionId,
    checkoutUrl: input.checkoutUrl,
    bookingId: input.bookingId,
    sessionExpiresAt,
  };
}

function finishedReserve(plan: ReservePlan): ReserveResult | null {
  if (plan.kind === 'reject') return { outcome: 'rejected' };
  if (plan.kind === 'reuse') return reuseOf(plan.claim);
  return null;
}

export function createMemoryNetworkLedger(): NetworkRedeemLedger {
  const rows = new Map<string, NetworkClaim>();

  return {
    async reserve(input) {
      // Check and insert stay synchronous so two callers cannot both pass.
      const existing = rows.get(input.jti) ?? null;
      const plan = planReserve(existing, input);
      const done = finishedReserve(plan);
      if (done) return done;
      rows.set(input.jti, pendingClaim(input));
      return { outcome: 'reserved' };
    },
    async commit(input) {
      const existing = rows.get(input.jti) ?? null;
      const next = nextClaimOnCommit(existing, input);
      if (next === 'reject') return 'rejected';
      if (next === 'reuse') return 'reused';
      rows.set(input.jti, next);
      return 'committed';
    },
    async release(jti) {
      const existing = rows.get(jti);
      if (existing?.status === 'pending') rows.delete(jti);
    },
    async markPaid(jti) {
      const existing = rows.get(jti);
      if (existing?.status !== 'open') return;
      rows.set(jti, { ...existing, status: 'paid' });
    },
    async get(jti) {
      return rows.get(jti) ?? null;
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function claimFromProps(props: Record<string, unknown>): NetworkClaim | null {
  if (props.kind !== KIND || typeof props.redeem_jti !== 'string') return null;
  const status = props.redeem_status;
  if (status !== 'pending' && status !== 'open' && status !== 'paid' && status !== 'released') {
    return null;
  }
  const text = (key: string): string | null => {
    const value = props[key];
    return typeof value === 'string' && value.length > 0 ? value : null;
  };
  const email = text('redeem_email');
  const expiresAt = text('redeem_expires_at');
  const leaseUntil = text('redeem_lease_until');
  if (!email || !expiresAt || !leaseUntil) return null;
  return {
    jti: props.redeem_jti,
    email,
    status,
    expiresAt,
    leaseUntil,
    stripeSessionId: text('redeem_session_id'),
    checkoutUrl: text('redeem_checkout_url'),
    bookingId: text('redeem_booking_id'),
    sessionExpiresAt: text('redeem_session_expires_at'),
  };
}

function propsOf(claim: NetworkClaim): Record<string, string> {
  return {
    kind: KIND,
    redeem_jti: claim.jti,
    redeem_email: claim.email,
    redeem_status: claim.status,
    redeem_expires_at: claim.expiresAt,
    redeem_lease_until: claim.leaseUntil,
    redeem_session_id: claim.stripeSessionId ?? '',
    redeem_checkout_url: claim.checkoutUrl ?? '',
    redeem_booking_id: claim.bookingId ?? '',
    redeem_session_expires_at: claim.sessionExpiresAt ?? '',
  };
}

function eventBody(eventId: string, claim: NetworkClaim): Record<string, unknown> {
  return {
    id: eventId,
    summary: 'Network Consultation credit',
    description:
      'Redemption record for a network Consultation link. This is not a scheduled Consultation and it does not add a Google Meet link.',
    transparency: 'transparent',
    visibility: 'private',
    start: { dateTime: REDEEM_EVENT_START },
    end: { dateTime: REDEEM_EVENT_END },
    extendedProperties: { private: propsOf(claim) },
  };
}

interface CalendarRow {
  readonly etag: string;
  readonly claim: NetworkClaim;
}

export function createGoogleNetworkLedger(
  env: ConsultationEnv,
  fetchImpl: typeof fetch = fetch,
): NetworkRedeemLedger {
  const calendarId = env.calendarId ?? '';
  const collection = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

  async function calendarFetch(url: string, init: RequestInit): Promise<Response> {
    const token = await googleAccessToken(env, fetchImpl, CALENDAR_SCOPE);
    const headers = new Headers(init.headers);
    headers.set('authorization', `Bearer ${token}`);
    if (init.body) headers.set('content-type', 'application/json');
    return providerFetch(url, { ...init, headers }, fetchImpl);
  }

  function rowFromPayload(payload: unknown): CalendarRow | null {
    const record = asRecord(payload);
    if (!record) return null;
    const extended = asRecord(record.extendedProperties);
    const props = asRecord(extended?.private);
    if (!props) return null;
    const claim = claimFromProps(props);
    if (!claim) return null;
    const etag = typeof record.etag === 'string' ? record.etag : '';
    return { etag, claim };
  }

  async function readRow(eventId: string): Promise<CalendarRow | null> {
    const response = await calendarFetch(`${collection}/${encodeURIComponent(eventId)}`, {
      method: 'GET',
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`google-calendar:${response.status}`);
    return rowFromPayload(await response.json());
  }

  async function insertRow(eventId: string, claim: NetworkClaim): Promise<'created' | 'conflict'> {
    const response = await calendarFetch(`${collection}?sendUpdates=none`, {
      method: 'POST',
      body: JSON.stringify(eventBody(eventId, claim)),
    });
    if (response.status === 409) {
      await response.text();
      return 'conflict';
    }
    if (!response.ok) throw new Error(`google-calendar:${response.status}`);
    await response.text();
    return 'created';
  }

  async function patchRow(
    eventId: string,
    etag: string,
    claim: NetworkClaim,
  ): Promise<'ok' | 'conflict'> {
    const headers = new Headers();
    if (etag) headers.set('if-match', etag);
    const response = await calendarFetch(
      `${collection}/${encodeURIComponent(eventId)}?sendUpdates=none`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify(eventBody(eventId, claim)),
      },
    );
    if (response.status === 409 || response.status === 412) {
      await response.text();
      return 'conflict';
    }
    if (!response.ok) throw new Error(`google-calendar:${response.status}`);
    await response.text();
    return 'ok';
  }

  return {
    async reserve(input) {
      if (!calendarId) throw new Error('google-calendar');
      const eventId = await networkRedeemEventId(input.jti);
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const current = await readRow(eventId);
        const plan = planReserve(current?.claim ?? null, input);
        const done = finishedReserve(plan);
        if (done) return done;
        const pending = pendingClaim(input);
        if (!current) {
          const inserted = await insertRow(eventId, pending);
          if (inserted === 'created') return { outcome: 'reserved' };
          continue;
        }
        const patched = await patchRow(eventId, current.etag, pending);
        if (patched === 'ok') return { outcome: 'reserved' };
      }
      return { outcome: 'rejected' };
    },
    async commit(input) {
      if (!calendarId) throw new Error('google-calendar');
      const eventId = await networkRedeemEventId(input.jti);
      const current = await readRow(eventId);
      const next = nextClaimOnCommit(current?.claim ?? null, input);
      if (next === 'reject') return 'rejected';
      if (next === 'reuse') return 'reused';
      if (!current) return 'rejected';
      const patched = await patchRow(eventId, current.etag, next);
      return patched === 'ok' ? 'committed' : 'rejected';
    },
    async release(jti) {
      if (!calendarId) return;
      const eventId = await networkRedeemEventId(jti);
      const current = await readRow(eventId);
      if (current?.claim.status !== 'pending') return;
      const released: NetworkClaim = {
        ...current.claim,
        status: 'released',
        stripeSessionId: null,
        checkoutUrl: null,
        bookingId: null,
        sessionExpiresAt: null,
      };
      await patchRow(eventId, current.etag, released);
    },
    async markPaid(jti) {
      if (!calendarId) return;
      const eventId = await networkRedeemEventId(jti);
      const current = await readRow(eventId);
      if (current?.claim.status !== 'open') return;
      await patchRow(eventId, current.etag, { ...current.claim, status: 'paid' });
    },
    async get(jti) {
      if (!calendarId) return null;
      const eventId = await networkRedeemEventId(jti);
      const current = await readRow(eventId);
      return current?.claim ?? null;
    },
  };
}
