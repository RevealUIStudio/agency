import { describe, expect, it } from 'vitest';
import {
  mintNetworkToken,
  networkBookPath,
  networkEmailHint,
  networkEmailMatches,
  parseNetworkLinkBody,
  verifyNetworkToken,
} from '@/lib/consultation-network-waive';

const SECRET = 'network-test-secret';
const NOW = new Date('2026-01-06T15:00:00.000Z');

describe('network waive token', () => {
  it('round-trips a signed token and rejects tamper, expiry, and the wrong secret', async () => {
    const minted = await mintNetworkToken({
      secret: SECRET,
      now: NOW,
      email: 'Ada@Example.com',
      jti: 'jti-round',
      ttlSeconds: 72 * 60 * 60,
    });
    expect(minted.claims).toMatchObject({
      v: 1,
      stage_b_fee: 'waived_network',
      jti: 'jti-round',
      email: 'ada@example.com',
    });
    const verified = await verifyNetworkToken({ secret: SECRET, token: minted.token, now: NOW });
    expect(verified).toEqual(minted.claims);
    expect(networkEmailMatches(minted.claims, 'ada@example.com')).toBe(true);
    expect(networkEmailMatches(minted.claims, 'other@example.com')).toBe(false);
    expect(networkEmailHint('ada@example.com')).toBe('a***@example.com');

    const tampered = `${minted.token.slice(0, -1)}${minted.token.endsWith('a') ? 'b' : 'a'}`;
    expect(await verifyNetworkToken({ secret: SECRET, token: tampered, now: NOW })).toBeNull();
    expect(
      await verifyNetworkToken({ secret: 'other-secret', token: minted.token, now: NOW }),
    ).toBeNull();

    const expired = await mintNetworkToken({
      secret: SECRET,
      now: NOW,
      ttlSeconds: -10,
      jti: 'jti-expired',
    });
    expect(await verifyNetworkToken({ secret: SECRET, token: expired.token, now: NOW })).toBeNull();
    expect(await verifyNetworkToken({ secret: '', token: minted.token, now: NOW })).toBeNull();
  });

  it('builds a book path and rejects a bad mint body', () => {
    expect(networkBookPath('token.value', 2)).toBe('/consultation/book?nw=token.value&hours=2');
    expect(parseNetworkLinkBody({})).toEqual({ ttlSeconds: 72 * 60 * 60 });
    expect(parseNetworkLinkBody({ email: 'Ada@Example.com', hours: 2, ttl_hours: 24 })).toEqual({
      email: 'ada@example.com',
      hours: 2,
      ttlSeconds: 24 * 60 * 60,
    });
    expect(parseNetworkLinkBody({ email: 'not-an-email' })).toBeNull();
    expect(parseNetworkLinkBody({ hours: 9 })).toBeNull();
    expect(parseNetworkLinkBody({ ttl_hours: 0 })).toBeNull();
    expect(parseNetworkLinkBody({ role: 'owner' })).toEqual({ ttlSeconds: 72 * 60 * 60 });
  });
});
