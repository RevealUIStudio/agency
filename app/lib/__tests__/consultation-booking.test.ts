import { describe, expect, it } from 'vitest';
import {
  applyPaidSchedule,
  buildConfirmationEmail,
  createHold,
  deskScheduleTransition,
  parseBookBody,
} from '@/lib/consultation-booking';
import {
  bookingIdFromCheckoutUrl,
  calendarInviteDescription,
  readConsultationReceipt,
  rememberConsultationReceipt,
} from '@/lib/consultation-buyer';

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
  it('includes payment, the slot, and the Meet link', () => {
    const email = buildConfirmationEmail({
      booking_id: 'book_1',
      start,
      end,
      hours: 1,
      name: 'Ada Buyer',
      email: 'ada@example.com',
      company: 'Example Co',
      stage_b: false,
      status: 'paid_scheduled',
      expires_at: start,
      event_id: 'evt_book_1',
      meet_link: 'https://meet.google.com/lookup/book_1',
      stripe_session_id: 'cs_1',
    });
    expect(email.subject).toBe('RevealUI Studio Consultation, Wed, Jan 7 · 9:00 AM–10:00 AM ET');
    expect(email.text).toContain('Payment received');
    expect(email.text).toContain('When: Wed, Jan 7 · 9:00 AM–10:00 AM ET');
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
    expect(invite).toContain('Stage B ($297) is on this payment.');
    expect(invite).not.toMatch(/sheet writer/i);
    expect(invite).not.toMatch(/included|waiv|free/i);
  });
});
