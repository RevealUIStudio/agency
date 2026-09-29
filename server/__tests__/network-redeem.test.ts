/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import { NETWORK_LINK_USED } from '../../app/lib/consultation-buyer';
import {
  createGoogleNetworkLedger,
  createMemoryNetworkLedger,
  NETWORK_CHECKOUT_SESSION_MAX_MS,
  NETWORK_CLAIM_LEASE_MS,
  networkRedeemEventId,
  nextClaimOnCommit,
  planReserve,
  type ReserveInput,
} from '../network-redeem';

const NOW = new Date('2026-01-06T15:00:00.000Z');
const EXPIRES = new Date(NOW.getTime() + 72 * 60 * 60 * 1000);

function reserveInput(extra: Partial<ReserveInput> = {}): ReserveInput {
  return {
    jti: 'jti-ledger',
    email: 'ada@example.com',
    expiresAt: EXPIRES,
    now: NOW,
    ...extra,
  };
}

describe('network redeem ledger', () => {
  it('accepts the first redemption', async () => {
    const ledger = createMemoryNetworkLedger();
    const reserved = await ledger.reserve(reserveInput());
    expect(reserved).toEqual({ outcome: 'reserved' });
    const committed = await ledger.commit({
      ...reserveInput(),
      stripeSessionId: 'cs_test_1',
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1',
      bookingId: 'book_1',
    });
    expect(committed).toBe('committed');
    const claim = await ledger.get('jti-ledger');
    expect(claim?.status).toBe('open');
    expect(claim?.email).toBe('ada@example.com');
    expect(claim?.stripeSessionId).toBe('cs_test_1');
    expect(claim?.expiresAt).toBe(EXPIRES.toISOString());
    const openFor = Date.parse(claim?.sessionExpiresAt ?? '') - NOW.getTime();
    expect(openFor).toBe(NETWORK_CHECKOUT_SESSION_MAX_MS);
  });

  it('reuses the same open session and rejects a second one', async () => {
    const ledger = createMemoryNetworkLedger();
    await ledger.reserve(reserveInput());
    await ledger.commit({
      ...reserveInput(),
      stripeSessionId: 'cs_test_1',
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1',
      bookingId: 'book_1',
    });
    const again = await ledger.commit({
      ...reserveInput(),
      stripeSessionId: 'cs_test_1',
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1',
      bookingId: 'book_1',
    });
    expect(again).toBe('reused');
    const sameBuyer = await ledger.reserve(reserveInput());
    expect(sameBuyer).toEqual({
      outcome: 'reuse',
      bookingId: 'book_1',
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1',
      stripeSessionId: 'cs_test_1',
    });
    const otherSession = await ledger.commit({
      ...reserveInput(),
      stripeSessionId: 'cs_test_other',
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_other',
      bookingId: 'book_2',
    });
    expect(otherSession).toBe('rejected');
    const otherEmail = await ledger.reserve(reserveInput({ email: 'other@example.com' }));
    expect(otherEmail).toEqual({ outcome: 'rejected' });
    expect(NETWORK_LINK_USED).toBe('This network Consultation link has already been used.');
  });

  it('rejects a second redemption after the session is no longer open', async () => {
    const ledger = createMemoryNetworkLedger();
    await ledger.reserve(reserveInput());
    await ledger.commit({
      ...reserveInput(),
      stripeSessionId: 'cs_test_1',
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1',
      bookingId: 'book_1',
    });
    const later = new Date(NOW.getTime() + NETWORK_CHECKOUT_SESSION_MAX_MS + 1000);
    const closed = await ledger.reserve(reserveInput({ now: later }));
    expect(closed).toEqual({ outcome: 'rejected' });
    expect((await ledger.get('jti-ledger'))?.status).toBe('open');

    await ledger.markPaid('jti-ledger');
    const paid = await ledger.reserve(reserveInput());
    expect(paid).toEqual({ outcome: 'rejected' });
    expect((await ledger.get('jti-ledger'))?.status).toBe('paid');
  });

  it('allows retry after a failed checkout and after a lapsed reservation', async () => {
    const ledger = createMemoryNetworkLedger();
    expect(await ledger.reserve(reserveInput())).toEqual({ outcome: 'reserved' });
    await ledger.release('jti-ledger');
    expect(await ledger.get('jti-ledger')).toBeNull();
    expect(await ledger.reserve(reserveInput())).toEqual({ outcome: 'reserved' });

    const stuck = createMemoryNetworkLedger();
    await stuck.reserve(reserveInput());
    const blocked = await stuck.reserve(reserveInput());
    expect(blocked).toEqual({ outcome: 'rejected' });
    const afterLease = new Date(NOW.getTime() + NETWORK_CLAIM_LEASE_MS + 1);
    expect(await stuck.reserve(reserveInput({ now: afterLease }))).toEqual({ outcome: 'reserved' });
  });

  it('ignores an expired claim when the token TTL has passed', () => {
    const expired = planReserve(
      {
        jti: 'jti-old',
        email: 'ada@example.com',
        status: 'open',
        expiresAt: new Date(NOW.getTime() - 1000).toISOString(),
        leaseUntil: EXPIRES.toISOString(),
        stripeSessionId: 'cs_test_1',
        checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1',
        bookingId: 'book_1',
        sessionExpiresAt: EXPIRES.toISOString(),
      },
      reserveInput({ jti: 'jti-old' }),
    );
    expect(expired.kind).toBe('replace');
    expect(
      nextClaimOnCommit(
        {
          jti: 'jti-old',
          email: 'ada@example.com',
          status: 'open',
          expiresAt: new Date(NOW.getTime() - 1000).toISOString(),
          leaseUntil: EXPIRES.toISOString(),
          stripeSessionId: 'cs_test_1',
          checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1',
          bookingId: 'book_1',
          sessionExpiresAt: EXPIRES.toISOString(),
        },
        {
          ...reserveInput({ jti: 'jti-old' }),
          stripeSessionId: 'cs_test_2',
          checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_2',
          bookingId: 'book_2',
        },
      ),
    ).toBe('reject');
  });

  it('lets only one of two concurrent redeems win', async () => {
    const ledger = createMemoryNetworkLedger();
    const [first, second] = await Promise.all([
      ledger.reserve(reserveInput({ jti: 'jti-race' })),
      ledger.reserve(reserveInput({ jti: 'jti-race' })),
    ]);
    expect([first.outcome, second.outcome].sort()).toEqual(['rejected', 'reserved']);
    expect((await ledger.get('jti-race'))?.status).toBe('pending');
  });

  it('derives a stable calendar event id', async () => {
    const id = await networkRedeemEventId('jti-event');
    expect(id).toBe(await networkRedeemEventId('jti-event'));
    expect(id).not.toBe(await networkRedeemEventId('jti-other'));
    expect(id).toMatch(/^[a-v0-9]{5,1024}$/);
  });
});

describe('calendar redemption rows', () => {
  function googleLedger() {
    const events = new Map<string, { etag: string; body: Record<string, unknown> }>();
    let serial = 1;
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url === 'https://oauth2.googleapis.com/token') {
        return new Response(JSON.stringify({ access_token: 'tok-redeem', expires_in: 3600 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      const eventId = decodeURIComponent(url.split('/events/')[1]?.split('?')[0] ?? '');
      if (method === 'POST') {
        const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
        const id = typeof body.id === 'string' ? body.id : '';
        if (!id || events.has(id)) return new Response('conflict', { status: 409 });
        const etag = `"${serial}"`;
        serial += 1;
        const stored = { ...body, etag };
        events.set(id, { etag, body: stored });
        return new Response(JSON.stringify(stored), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (method === 'GET') {
        const current = events.get(eventId);
        if (!current) return new Response('missing', { status: 404 });
        return new Response(JSON.stringify(current.body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (method === 'PATCH') {
        const current = events.get(eventId);
        if (!current) return new Response('missing', { status: 404 });
        const match = new Headers(init?.headers).get('if-match');
        if (match && match !== current.etag) return new Response('stale', { status: 412 });
        const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
        const etag = `"${serial}"`;
        serial += 1;
        const stored = { ...current.body, ...body, id: eventId, etag };
        events.set(eventId, { etag, body: stored });
        return new Response(JSON.stringify(stored), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('no', { status: 500 });
    };
    const ledger = createGoogleNetworkLedger(
      {
        calendarId: 'founder',
        oauthClientId: 'redeem-oauth',
        oauthClientSecret: 'redeem-secret',
        oauthRefreshToken: 'redeem-refresh',
      },
      fetchImpl,
    );
    return { ledger, events };
  }

  it('inserts one calendar row and rejects the concurrent second insert', async () => {
    const { ledger, events } = googleLedger();
    const [first, second] = await Promise.all([
      ledger.reserve(reserveInput({ jti: 'jti-google' })),
      ledger.reserve(reserveInput({ jti: 'jti-google' })),
    ]);
    expect([first.outcome, second.outcome].sort()).toEqual(['rejected', 'reserved']);
    expect(events.size).toBe(1);
    const row = [...events.values()][0]?.body;
    expect(row?.summary).toBe('Network Consultation credit');
    expect(row?.transparency).toBe('transparent');
    expect(row?.start).toEqual({ dateTime: '2000-01-01T00:00:00.000Z' });
    const description = typeof row?.description === 'string' ? row.description : '';
    expect(description).toContain('Google Meet');
    expect(description.replaceAll('Google Meet', '')).not.toMatch(/Meet/);

    const committed = await ledger.commit({
      ...reserveInput({ jti: 'jti-google' }),
      stripeSessionId: 'cs_test_1',
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1',
      bookingId: 'book_1',
    });
    expect(committed).toBe('committed');
    const reuse = await ledger.reserve(reserveInput({ jti: 'jti-google' }));
    expect(reuse.outcome).toBe('reuse');
    await ledger.release('jti-google');
    expect((await ledger.get('jti-google'))?.status).toBe('open');
  });

  it('releases a failed checkout and lets the same buyer reserve again', async () => {
    const { ledger } = googleLedger();
    expect(await ledger.reserve(reserveInput({ jti: 'jti-release' }))).toEqual({
      outcome: 'reserved',
    });
    await ledger.release('jti-release');
    expect((await ledger.get('jti-release'))?.status).toBe('released');
    expect(await ledger.reserve(reserveInput({ jti: 'jti-release' }))).toEqual({
      outcome: 'reserved',
    });
    expect((await ledger.get('jti-release'))?.status).toBe('pending');
  });
});
