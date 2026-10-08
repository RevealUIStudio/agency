import { describe, expect, it } from 'vitest';
import { createGoogleCalendar } from '../consultation-calendar';

describe('durable Calendar refund ledger', () => {
  it('retains scope review and monotonic provider evidence across fresh Calendar adapters', async () => {
    let revision = 1;
    let privateProps: Record<string, string> = {
      kind: 'studio-consultation',
      booking_id: 'booking-refund',
      status: 'paid_scheduled',
      start: '2026-10-08T14:00:00Z',
      end: '2026-10-08T15:00:00Z',
      hours: '1',
      buyer_name: 'Ada',
      buyer_email: 'ada@example.com',
      stage_b: 'true',
      stage_b_fee: 'paid_addon',
      stripe_session_id: 'cs_refund',
      expires_at: '2026-10-08T14:00:00Z',
    };
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = new URL(String(input));
      expect(init?.redirect).toBe('error');
      expect(init?.signal).toBeDefined();
      if (url.hostname === 'oauth2.googleapis.com')
        return new Response(JSON.stringify({ access_token: 'provider-test', expires_in: 3600 }));
      if (init?.method === 'PATCH') {
        expect(url.searchParams.get('sendUpdates')).toBe('none');
        expect(new Headers(init.headers).get('if-match')).toBe(`version-${revision}`);
        const body = JSON.parse(String(init.body));
        expect(body.attendees).toBeUndefined();
        expect(body.conferenceData).toBeUndefined();
        privateProps = body.extendedProperties.private;
        revision += 1;
        return new Response(JSON.stringify({ id: 'event-refund' }));
      }
      expect(url.searchParams.get('privateExtendedProperty')).toBe('booking_id=booking-refund');
      return new Response(
        JSON.stringify({
          items: [
            {
              id: 'event-refund',
              etag: `version-${revision}`,
              extendedProperties: { private: privateProps },
            },
          ],
        }),
      );
    };
    const adapter = () =>
      createGoogleCalendar(
        {
          calendarId: 'calendar-test',
          oauthClientId: 'client-test',
          oauthClientSecret: 'secret-test',
          oauthRefreshToken: 'refresh-test',
        },
        fetchImpl,
      );
    const partial = { chargeId: 'ch_refund', amountRefunded: 1000, full: false };
    await adapter().recordRefund('booking-refund', 'cs_refund', partial);
    expect((await adapter().get('booking-refund'))?.refund).toEqual({
      ...partial,
      domainPackReview: 'review_required',
    });
    await adapter().resolveDomainPackRefund('booking-refund', 'ch_refund', 1000, 'retained');
    await adapter().recordRefund('booking-refund', 'cs_refund', partial);
    expect((await adapter().get('booking-refund'))?.refund?.domainPackReview).toBe('retained');
    await adapter().recordRefund('booking-refund', 'cs_refund', {
      ...partial,
      amountRefunded: 2000,
    });
    expect((await adapter().get('booking-refund'))?.refund?.domainPackReview).toBe(
      'review_required',
    );
    const full = { ...partial, amountRefunded: 59700, full: true };
    await adapter().recordRefund('booking-refund', 'cs_refund', full);
    await adapter().recordRefund('booking-refund', 'cs_refund', partial);
    expect((await adapter().get('booking-refund'))?.refund).toEqual({
      ...full,
      domainPackReview: 'not_applicable',
    });
    await expect(
      adapter().resolveDomainPackRefund('booking-refund', 'ch_refund', 59700, 'retained'),
    ).rejects.toThrow('refund-review-binding');
    await expect(adapter().recordRefund('booking-refund', 'cs_other', full)).rejects.toThrow(
      'refund-binding',
    );
  });
});
