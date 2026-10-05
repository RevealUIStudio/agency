import { describe, expect, it } from 'vitest';
import { refundedCheckoutFromStripe } from '../consultation-stripe';

function provider(summary: number, pages: { has_more: boolean; data: unknown[] }[]) {
  let page = 0;
  const cursors: (string | null)[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    expect(init?.redirect).toBe('error');
    expect(init?.signal).toBeDefined();
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer sk_test_provider');
    let body: unknown;
    if (url.pathname.includes('/charges/'))
      body = {
        id: 'ch_provider',
        payment_intent: 'pi_provider',
        amount: 10000,
        amount_refunded: summary,
        currency: 'usd',
      };
    else if (url.pathname === '/v1/refunds') {
      cursors.push(url.searchParams.get('starting_after'));
      body = pages[page++];
    } else
      body = {
        has_more: false,
        data: [
          {
            id: 'cs_provider',
            mode: 'payment',
            payment_status: 'paid',
            payment_intent: 'pi_provider',
            amount_total: 10000,
            metadata: { booking_id: 'booking-provider' },
          },
        ],
      };
    return new Response(JSON.stringify(body));
  };
  return { fetchImpl, cursors };
}
const refund = (id: string, amount: number, status = 'succeeded') => ({
  id,
  charge: 'ch_provider',
  amount,
  currency: 'usd',
  status,
});

describe('complete succeeded refund provider authority', () => {
  it('retries inconsistent zero charge summaries instead of acknowledging a succeeded refund as ignored', async () => {
    const remote = provider(0, [{ has_more: false, data: [refund('re_current', 1000)] }]);
    await expect(
      refundedCheckoutFromStripe('sk_test_provider', 'ch_provider', remote.fetchImpl),
    ).rejects.toThrow('stripe-refund-invalid');
    expect(remote.cursors).toEqual([null]);
  });

  it('only ignores a complete list with no succeeded refund', async () => {
    const remote = provider(0, [
      { has_more: false, data: [refund('re_pending', 1000, 'pending')] },
    ]);
    expect(
      await refundedCheckoutFromStripe('sk_test_provider', 'ch_provider', remote.fetchImpl),
    ).toBeNull();
    expect(remote.cursors).toEqual([null]);
  });

  it('follows provider pagination before computing cumulative scope', async () => {
    const remote = provider(10000, [
      { has_more: true, data: [refund('re_first', 4000)] },
      { has_more: false, data: [refund('re_second', 6000)] },
    ]);
    expect(
      await refundedCheckoutFromStripe('sk_test_provider', 'ch_provider', remote.fetchImpl),
    ).toMatchObject({ bookingId: 'booking-provider', amountRefunded: 10000, full: true });
    expect(remote.cursors).toEqual([null, 're_first']);
  });

  it('rejects duplicate and incomplete pages instead of treating partial evidence as final', async () => {
    const duplicate = provider(1000, [
      { has_more: true, data: [refund('re_repeated', 500)] },
      { has_more: false, data: [refund('re_repeated', 500)] },
    ]);
    await expect(
      refundedCheckoutFromStripe('sk_test_provider', 'ch_provider', duplicate.fetchImpl),
    ).rejects.toThrow('stripe-refund-invalid');
    const empty = provider(1000, [{ has_more: true, data: [] }]);
    await expect(
      refundedCheckoutFromStripe('sk_test_provider', 'ch_provider', empty.fetchImpl),
    ).rejects.toThrow('stripe-refund-incomplete');
  });
});
