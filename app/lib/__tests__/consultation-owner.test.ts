import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Booking } from '@/lib/consultation-booking';
import {
  CONSULTATION_MEET_FALLBACK,
  confirmationSubject,
  confirmationText,
  googleMeetUrl,
  parseConsultationBookingPayload,
} from '@/lib/consultation-buyer';
import { buildOwnerPaidNotice } from '@/lib/consultation-owner';

const repoRoot = path.resolve(import.meta.dirname, '../../..');

const booking: Booking = {
  booking_id: 'book_copy',
  start: '2026-01-07T14:00:00.000Z',
  end: '2026-01-07T15:00:00.000Z',
  hours: 1,
  name: 'Ada Buyer',
  email: 'ada@example.com',
  company: null,
  stage_b: false,
  stage_b_fee: 'none',
  network_jti: null,
  status: 'paid_scheduled',
  expires_at: '2026-01-07T14:00:00.000Z',
  event_id: 'evt_copy',
  meet_link: null,
  stripe_session_id: 'cs_copy',
};

describe('consultation mail copy', () => {
  it('keeps RevealUI Studio, Google Meet, and no em dash in buyer and owner text', () => {
    const subject = confirmationSubject(booking.start, booking.end);
    const text = confirmationText(booking);
    expect(subject).toContain('RevealUI Studio');
    expect(text).toContain(`Google Meet: ${CONSULTATION_MEET_FALLBACK}`);
    expect(text).not.toContain('The Meet link');
    expect(`${subject}\n${text}`).not.toContain('\u2014');
    const notice = buildOwnerPaidNotice(booking, null);
    expect(notice.subject).toContain('RevealUI Studio');
    expect(notice.text).toContain(`Google Meet: ${CONSULTATION_MEET_FALLBACK}`);
    expect(notice.text).not.toContain('\u2014');
    expect(notice.to).toBe('founder@revealui.com');
  });

  it('does not mount the product wordmark on Studio consultation mail', () => {
    const files = [
      'app/lib/consultation-buyer.ts',
      'app/lib/consultation-owner.ts',
      'server/consultation-owner-mail.ts',
      'app/components/ConsultationHeader.tsx',
    ];
    const hits = files.filter((rel) =>
      readFileSync(path.join(repoRoot, rel), 'utf8').includes('RevealUIWordmark'),
    );
    expect(hits).toEqual([]);
    const doc = readFileSync(path.join(repoRoot, 'docs/consultation-confirm-email.md'), 'utf8');
    expect(doc).toContain('Google Meet:');
    expect(doc).toContain('Do not mount the product `RevealUIWordmark`');
    expect(doc).not.toContain('The Meet link');
    expect(doc).not.toMatch(/(^|\n)Meet:/);
    expect(doc).not.toContain('\u2014');
  });

  it('accepts a Google Meet URL and drops anything else', () => {
    expect(googleMeetUrl('https://meet.google.com/lookup/book_copy')).toBe(
      'https://meet.google.com/lookup/book_copy',
    );
    expect(googleMeetUrl('http://meet.google.com/abc-defg-hij')).toBeNull();
    expect(googleMeetUrl('https://example.com/meet')).toBeNull();
    expect(googleMeetUrl('javascript:alert(1)')).toBeNull();
    expect(
      parseConsultationBookingPayload({
        ok: true,
        start: booking.start,
        end: booking.end,
        meet_link: 'https://meet.google.com/lookup/book_copy',
        stage_b: false,
      }),
    ).toMatchObject({
      kind: 'paid',
      meetLink: 'https://meet.google.com/lookup/book_copy',
      stageB: false,
    });
    expect(parseConsultationBookingPayload({ ok: false, reason: 'pending' })).toEqual({
      kind: 'pending',
    });
    expect(
      parseConsultationBookingPayload({
        ok: true,
        start: booking.start,
        end: booking.end,
        meet_link: 'https://example.com/not-meet',
        stage_b: true,
      }),
    ).toMatchObject({ kind: 'paid', meetLink: null, stageB: true });
  });
});
