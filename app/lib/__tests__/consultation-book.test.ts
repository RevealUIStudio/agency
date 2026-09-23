import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { INTRO_CALL_URL } from '@/lib/site';
import {
  CONSULTATION_STRIPE_PRICE_ID,
  consultationCheckoutCents,
  consultationCheckoutLines,
  consultationCheckoutMetadata,
  enumerateConsultationSlots,
  PUBLIC_BOOKER_STRINGS,
  STAGE_B_STRIPE_PRICE_ID,
  zonedTimeToUtc,
} from '../consultation-book';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const now = new Date('2026-09-23T12:00:00.000Z');
const dayEnd = new Date('2026-09-24T02:00:00.000Z');

function startsOn(day: Date): string[] {
  return enumerateConsultationSlots({ from: day, to: dayEnd, now, hours: 1 }).map(
    (slot) => slot.start,
  );
}

describe('consultation slots', () => {
  it('offers weekday 60-minute slots from 9:00 AM to 4:00 PM Eastern', () => {
    const slots = enumerateConsultationSlots({ from: now, to: dayEnd, now, hours: 1 });
    expect(slots).toHaveLength(8);
    expect(slots[0]).toMatchObject({
      start: '2026-09-23T13:00:00.000Z',
      end: '2026-09-23T14:00:00.000Z',
    });
    expect(slots[7]).toMatchObject({
      start: '2026-09-23T20:00:00.000Z',
      end: '2026-09-23T21:00:00.000Z',
    });
    expect(slots.map((slot) => slot.start)).not.toContain('2026-09-23T12:00:00.000Z');
    expect(slots.map((slot) => slot.start)).not.toContain('2026-09-23T21:00:00.000Z');
    expect(slots[0]?.label).toContain('9:00 AM');
    expect(slots[0]?.label).toContain('EDT');
    expect(slots[0]?.dayLabel).toContain('Sep 23');
  });

  it('skips Saturday and Sunday', () => {
    const slots = enumerateConsultationSlots({
      from: new Date('2026-09-26T12:00:00.000Z'),
      to: new Date('2026-09-28T04:00:00.000Z'),
      now,
      hours: 1,
    });
    expect(slots).toEqual([]);
  });

  it('drops slots that overlap busy time or an active hold, and keeps a boundary touch', () => {
    const open = enumerateConsultationSlots({
      from: now,
      to: dayEnd,
      now,
      hours: 1,
      busy: [{ start: '2026-09-23T14:00:00.000Z', end: '2026-09-23T15:00:00.000Z' }],
      holds: [{ start: '2026-09-23T18:00:00.000Z', end: '2026-09-23T19:00:00.000Z' }],
    });
    const starts = open.map((slot) => slot.start);
    expect(starts).not.toContain('2026-09-23T14:00:00.000Z');
    expect(starts).not.toContain('2026-09-23T18:00:00.000Z');
    expect(starts).toContain('2026-09-23T13:00:00.000Z');
    expect(starts).toContain('2026-09-23T15:00:00.000Z');

    const touching = enumerateConsultationSlots({
      from: now,
      to: dayEnd,
      now,
      hours: 1,
      busy: [{ start: '2026-09-23T12:00:00.000Z', end: '2026-09-23T13:00:00.000Z' }],
    });
    expect(touching.map((slot) => slot.start)).toContain('2026-09-23T13:00:00.000Z');
  });

  it('requires the full block to finish by 5:00 PM when the buyer asks for two hours', () => {
    const slots = enumerateConsultationSlots({ from: now, to: dayEnd, now, hours: 2 });
    expect(slots).toHaveLength(7);
    expect(slots[0]).toMatchObject({
      start: '2026-09-23T13:00:00.000Z',
      end: '2026-09-23T15:00:00.000Z',
    });
    expect(slots[6]).toMatchObject({
      start: '2026-09-23T19:00:00.000Z',
      end: '2026-09-23T21:00:00.000Z',
    });
    const blocked = enumerateConsultationSlots({
      from: now,
      to: dayEnd,
      now,
      hours: 2,
      busy: [{ start: '2026-09-23T14:00:00.000Z', end: '2026-09-23T15:00:00.000Z' }],
    });
    expect(blocked.map((slot) => slot.start)).not.toContain('2026-09-23T13:00:00.000Z');
    expect(blocked.map((slot) => slot.start)).toContain('2026-09-23T15:00:00.000Z');
  });

  it('keeps 9:00 AM on the right UTC offset across Eastern daylight time', () => {
    expect(zonedTimeToUtc(2026, 10, 30, 9, 0).toISOString()).toBe('2026-10-30T13:00:00.000Z');
    expect(zonedTimeToUtc(2026, 11, 2, 9, 0).toISOString()).toBe('2026-11-02T14:00:00.000Z');
    const winter = enumerateConsultationSlots({
      from: new Date('2026-11-02T13:00:00.000Z'),
      to: new Date('2026-11-03T00:00:00.000Z'),
      now: new Date('2026-11-02T13:00:00.000Z'),
      hours: 1,
    });
    expect(winter[0]?.start).toBe('2026-11-02T14:00:00.000Z');
    expect(winter[0]?.label).toContain('EST');
  });

  it('does not offer a slot inside the one-hour lead', () => {
    expect(startsOn(now)).not.toContain('2026-09-23T12:00:00.000Z');
  });
});

describe('consultation checkout lines', () => {
  it('bills Consultation by the hour and adds Stage B only when asked', () => {
    expect(consultationCheckoutLines({ hours: 1, stageB: false })).toEqual([
      { price: CONSULTATION_STRIPE_PRICE_ID, quantity: 1 },
    ]);
    expect(consultationCheckoutLines({ hours: 3, stageB: false })).toEqual([
      { price: CONSULTATION_STRIPE_PRICE_ID, quantity: 3 },
    ]);
    expect(consultationCheckoutLines({ hours: 2, stageB: true })).toEqual([
      { price: CONSULTATION_STRIPE_PRICE_ID, quantity: 2 },
      { price: STAGE_B_STRIPE_PRICE_ID, quantity: 1 },
    ]);
    expect(consultationCheckoutCents(1, false)).toBe(30_000);
    expect(consultationCheckoutCents(3, false)).toBe(90_000);
    expect(consultationCheckoutCents(1, true)).toBe(59_700);
  });

  it('puts the booking id, slot, hours, stage b, and buyer on Checkout metadata', () => {
    expect(
      consultationCheckoutMetadata({
        bookingId: 'book_1',
        start: '2026-09-23T13:00:00.000Z',
        end: '2026-09-23T14:00:00.000Z',
        hours: 1,
        stageB: false,
        buyerEmail: 'ada@example.com',
        buyerName: 'Ada Lovelace',
        company: 'Analytical Engines',
      }),
    ).toEqual({
      booking_id: 'book_1',
      start: '2026-09-23T13:00:00.000Z',
      end: '2026-09-23T14:00:00.000Z',
      hours: '1',
      stage_b: 'false',
      buyer_email: 'ada@example.com',
      buyer_name: 'Ada Lovelace',
      company: 'Analytical Engines',
    });
  });
});

describe('consultation booker claim gate', () => {
  it('keeps public booker strings off waiver and free-consultation claims', () => {
    const forbidden =
      /waiv|free consultation|sometimes free|fee[- ]waiver|complimentary|stage b is free/i;
    for (const line of PUBLIC_BOOKER_STRINGS) {
      expect(line).not.toMatch(forbidden);
    }
    const files = [
      'app/lib/consultation-book.ts',
      'app/routes/ConsultationBookPage.tsx',
      'app/routes/ConsultationBookSuccessPage.tsx',
      'app/routes/ConsultationBookCancelPage.tsx',
    ];
    for (const file of files) {
      const text = readFileSync(path.join(repoRoot, file), 'utf8');
      expect(text).not.toMatch(forbidden);
      expect(text).not.toContain('calendar.google.com');
      expect(text).not.toContain(INTRO_CALL_URL);
    }
  });
});
