import { describe, expect, it } from 'vitest';
import {
  applyPaidSchedule,
  assessConsultationChange,
  type Booking,
  bookInputFromNetwork,
  buildConfirmationEmail,
  createHold,
  deskScheduleTransition,
  parseBookBody,
} from '@/lib/consultation-booking';
import {
  bookingIdFromCheckoutUrl,
  calendarInviteDescription,
  consultationBookDueCents,
  readConsultationReceipt,
  rememberConsultationReceipt,
} from '@/lib/consultation-buyer';
import { mintNetworkToken } from '@/lib/consultation-network-waive';

const start = '2026-01-07T14:00:00.000Z';
const end = '2026-01-07T15:00:00.000Z';

describe('consultation receipt', () => {
  it('keeps the slot only for the booking that started checkout', () => {
    sessionStorage.removeItem('consultation-receipt');
    expect(bookingIdFromCheckoutUrl('https://checkout.stripe.com/c/pay/cs_test')).toBe('');
    expect(
      bookingIdFromCheckoutUrl(
        'https://revealuistudio.com/consultation/book/success?booking=book_ux',
      ),
    ).toBe('book_ux');
    rememberConsultationReceipt('', { label: 'hidden', stageB: false });
    expect(sessionStorage.getItem('consultation-receipt')).toBeNull();
    rememberConsultationReceipt('book_ux', {
      label: 'Wed, Jan 7 · 9:00 AM–10:00 AM ET',
      stageB: true,
    });
    expect(readConsultationReceipt('book_ux')).toEqual({
      label: 'Wed, Jan 7 · 9:00 AM–10:00 AM ET',
      stageB: true,
    });
    expect(readConsultationReceipt('other')).toBeNull();
    sessionStorage.removeItem('consultation-receipt');
  });
});

describe('approved Consultation change policy', () => {
  const paid: Booking = {
    ...createHold(
      {
        start,
        end,
        hours: 1,
        name: 'Ada Buyer',
        email: 'ada@example.com',
        company: null,
        stageB: false,
        stageBFee: 'none',
        networkJti: null,
      },
      new Date('2026-01-05T00:00:00Z'),
      'book_policy',
    ),
    status: 'paid_scheduled',
    stripe_session_id: 'cs_paid',
  };
  function assess(
    hoursBefore: number,
    extra: Partial<Parameters<typeof assessConsultationChange>[0]> = {},
  ) {
    const notice = new Date(Date.parse(start) - hoursBefore * 3600000);
    return assessConsultationChange({
      booking: paid,
      noticeReceivedAt: notice.toISOString(),
      now: new Date('2026-01-09T00:00:00Z'),
      cancelledBy: 'buyer',
      lateReschedulesUsed: 0,
      domainPackDelivery: 'not_purchased',
      ...extra,
    });
  }
  it.each([
    24, 48,
  ])('allows full time refund or reschedule for %s-hour notice even when processed later', (hours) => {
    expect(assess(hours)).toMatchObject({
      ok: true,
      consultationRefund: 'full',
      freeReschedule: true,
      consumesShortNoticeReschedule: false,
      reason: 'at_least_24_hours',
    });
  });
  it('allows one short-notice reschedule just below the 24-hour boundary', () => {
    expect(assess(24 - 1 / 3600)).toMatchObject({
      ok: true,
      consultationRefund: 'owner_review',
      freeReschedule: true,
      consumesShortNoticeReschedule: true,
      reason: 'first_short_notice',
    });
    expect(assess(1, { lateReschedulesUsed: 1 })).toMatchObject({
      ok: true,
      freeReschedule: false,
      reason: 'short_notice_used',
    });
  });
  it.each([
    0, -1,
  ])('does not promise an automatic refund or reschedule at %s hours before the start', (hours) => {
    expect(assess(hours)).toMatchObject({
      ok: true,
      consultationRefund: 'owner_review',
      freeReschedule: false,
      reason: 'no_show',
    });
  });
  it('permits a time refund or new date when Studio cancels', () => {
    expect(assess(-1, { cancelledBy: 'studio', lateReschedulesUsed: 4 })).toMatchObject({
      ok: true,
      consultationRefund: 'full',
      freeReschedule: true,
      consumesShortNoticeReschedule: false,
      reason: 'studio_cancellation',
    });
  });
  it('keeps domain-pack delivery and its actual paid fee separate from Consultation notice', () => {
    const pack = { ...paid, stage_b: true, stage_b_fee: 'paid_addon' as const };
    expect(assess(1, { booking: pack, domainPackDelivery: 'undelivered' })).toMatchObject({
      domainPackRefund: 'undelivered_work',
    });
    expect(assess(48, { booking: pack, domainPackDelivery: 'delivered' })).toMatchObject({
      domainPackRefund: 'disclosed_scope',
    });
    expect(assess(48, { booking: pack, domainPackDelivery: 'unknown' })).toMatchObject({
      domainPackRefund: 'owner_review',
    });
    expect(
      assess(48, {
        booking: { ...pack, stage_b_fee: 'waived_network' },
        domainPackDelivery: 'undelivered',
      }),
    ).toMatchObject({ domainPackRefund: 'not_applicable' });
  });
  it('rejects unconfirmed bookings, future notice, invalid history and contradictory pack state', () => {
    expect(assess(48, { booking: { ...paid, status: 'slot_held' } })).toEqual({
      ok: false,
      error: 'not-paid',
    });
    expect(assess(48, { noticeReceivedAt: 'invalid' })).toEqual({
      ok: false,
      error: 'invalid-notice',
    });
    expect(assess(48, { now: new Date('2026-01-01T00:00:00Z') })).toEqual({
      ok: false,
      error: 'invalid-notice',
    });
    expect(assess(48, { lateReschedulesUsed: -1 })).toEqual({
      ok: false,
      error: 'invalid-history',
    });
    expect(assess(48, { lateReschedulesUsed: 0.5 })).toEqual({
      ok: false,
      error: 'invalid-history',
    });
    expect(assess(48, { domainPackDelivery: 'undelivered' })).toEqual({
      ok: false,
      error: 'invalid-pack-status',
    });
  });
});

describe('parseBookBody', () => {
  it('ignores a waive field and defaults Stage B off', () => {
    const parsed = parseBookBody({
      start,
      end,
      name: 'Ada Buyer',
      email: 'Ada@Example.com',
      waive: true,
    });
    expect(parsed).toMatchObject({
      start,
      end,
      hours: 1,
      name: 'Ada Buyer',
      email: 'ada@example.com',
      company: null,
      stageB: false,
      networkToken: null,
    });
    expect(parsed).not.toHaveProperty('stageBFee');
  });

  it('keeps a network token and ignores a forged fee field', () => {
    const parsed = parseBookBody({
      start,
      end,
      name: 'Ada Buyer',
      email: 'ada@example.com',
      stage_b: false,
      stage_b_fee: 'waived_network',
      waive: true,
      network_token: '  signed-token  ',
    });
    expect(parsed).toMatchObject({
      stageB: false,
      networkToken: 'signed-token',
    });
    if (!parsed) throw new Error('parsed');
    expect(bookInputFromNetwork(parsed, null)).toMatchObject({
      stageB: false,
      stageBFee: 'none',
      networkJti: null,
    });
  });
});

describe('applyPaidSchedule', () => {
  it('does not replace the Meet link on a second delivery', () => {
    const now = new Date('2026-01-06T15:00:00.000Z');
    const hold = createHold(
      {
        start,
        end,
        hours: 1,
        name: 'Ada Buyer',
        email: 'ada@example.com',
        company: null,
        stageB: false,
        stageBFee: 'none',
        networkJti: null,
      },
      now,
      'book_1',
    );
    const first = applyPaidSchedule(hold, {
      meetLink: 'https://meet.google.com/lookup/book_1',
      eventId: 'evt_book_1',
      stripeSessionId: 'cs_1',
    });
    const second = applyPaidSchedule(first.booking, {
      meetLink: 'https://meet.google.com/lookup/other',
      eventId: 'evt_other',
      stripeSessionId: 'cs_2',
    });
    expect(first.action).toBe('scheduled');
    expect(second.action).toBe('already_scheduled');
    expect(second.booking.meet_link).toBe('https://meet.google.com/lookup/book_1');
    expect(second.booking.event_id).toBe('evt_book_1');
    expect(second.booking.stripe_session_id).toBe('cs_1');
    expect(deskScheduleTransition(second.booking)).toMatchObject({
      applied: false,
      reason: 'no-desk-writer',
    });
  });
});

describe('buildConfirmationEmail', () => {
  it('includes payment, the slot, and the Google Meet link', () => {
    const email = buildConfirmationEmail({
      booking_id: 'book_1',
      start,
      end,
      hours: 1,
      name: 'Ada Buyer',
      email: 'ada@example.com',
      company: 'Example Co',
      stage_b: false,
      stage_b_fee: 'none',
      network_jti: null,
      status: 'paid_scheduled',
      expires_at: start,
      event_id: 'evt_book_1',
      meet_link: 'https://meet.google.com/lookup/book_1',
      stripe_session_id: 'cs_1',
    });
    expect(email.subject).toBe('RevealUI Studio Consultation, Wed, Jan 7 · 9:00 AM–10:00 AM ET');
    expect(email.subject).toContain('RevealUI Studio');
    expect(email.subject).not.toContain('\u2014');
    expect(email.text).toContain('Payment received');
    expect(email.text).toContain('When: Wed, Jan 7 · 9:00 AM–10:00 AM ET');
    expect(email.text).toContain('Google Meet: https://meet.google.com/lookup/book_1');
    expect(email.text).not.toMatch(/(^|\n)Meet:/);
    expect(email.text).not.toContain('The Meet link');
    expect(email.text).not.toContain('\u2014');
    expect(email.text).not.toContain(start);
    expect(email.text).toContain('https://meet.google.com/lookup/book_1');
    expect(email.text).toContain('Company: Example Co');
    expect(email.text).toContain('This payment is the consultation only.');
    expect(email.text).not.toMatch(/waiv/i);
    expect(email.text).not.toMatch(/free consultation/i);
    expect(email.text).not.toMatch(/included/i);
    expect(email.text).not.toMatch(/sheet writer/i);
    const invite = calendarInviteDescription({
      start,
      end,
      company: 'Example Co',
      stage_b: true,
    });
    expect(invite).toContain('When: Wed, Jan 7 · 9:00 AM–10:00 AM ET');
    expect(invite).toContain('The domain pack ($297) is on this payment.');
    expect(invite).not.toMatch(/sheet writer/i);
    expect(invite).not.toMatch(/domain pack.*(?:included|waived|free)/i);
    expect(invite).toContain('full refund of Consultation time or a free reschedule');
  });

  it('charges Consultation only while a verified network token keeps the pack on the order', async () => {
    expect(consultationBookDueCents(1, true, true)).toBe(30_000);
    expect(consultationBookDueCents(2, true, true)).toBe(60_000);
    expect(consultationBookDueCents(1, true, false)).toBe(59_700);
    expect(consultationBookDueCents(1, false, false)).toBe(30_000);
    const parsed = parseBookBody({
      start,
      end,
      name: 'Ada Buyer',
      email: 'ada@example.com',
      stage_b: false,
    });
    const { claims } = await mintNetworkToken({
      secret: 'network-test-secret',
      now: new Date('2026-01-06T15:00:00.000Z'),
      jti: 'jti-due',
    });
    if (!parsed) throw new Error('parsed');
    expect(bookInputFromNetwork(parsed, claims)).toMatchObject({
      stageB: true,
      stageBFee: 'waived_network',
      networkJti: 'jti-due',
    });
  });
});
