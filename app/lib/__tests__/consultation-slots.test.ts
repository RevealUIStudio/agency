import { describe, expect, it } from 'vitest';
import {
  generateConsultationSlots,
  type HeldInterval,
  type TimeInterval,
} from '@/lib/consultation-slots';

const winterFrom = new Date('2026-01-07T05:00:00.000Z');
const winterTo = new Date('2026-01-08T05:00:00.000Z');
const winterNow = new Date('2026-01-07T13:00:00.000Z');

describe('generateConsultationSlots', () => {
  it('lists eight weekday hours on a winter Wednesday in Eastern Time', () => {
    const slots = generateConsultationSlots({
      from: winterFrom,
      to: winterTo,
      now: winterNow,
      hours: 1,
    });
    expect(slots).toHaveLength(8);
    expect(slots[0]).toMatchObject({
      start: '2026-01-07T14:00:00.000Z',
      end: '2026-01-07T15:00:00.000Z',
    });
    expect(slots[7]).toMatchObject({
      start: '2026-01-07T21:00:00.000Z',
      end: '2026-01-07T22:00:00.000Z',
    });
    expect(slots[0]?.label).toContain('ET');
    expect(slots[0]?.label).toContain('9:00 AM');
  });

  it('shifts the same wall clock forward one hour in summer', () => {
    const slots = generateConsultationSlots({
      from: new Date('2026-07-08T04:00:00.000Z'),
      to: new Date('2026-07-09T04:00:00.000Z'),
      now: new Date('2026-07-08T12:00:00.000Z'),
      hours: 1,
    });
    expect(slots[0]).toMatchObject({
      start: '2026-07-08T13:00:00.000Z',
      end: '2026-07-08T14:00:00.000Z',
    });
    expect(slots).toHaveLength(8);
  });

  it('skips Saturday', () => {
    const slots = generateConsultationSlots({
      from: new Date('2026-01-10T05:00:00.000Z'),
      to: new Date('2026-01-11T05:00:00.000Z'),
      now: new Date('2026-01-10T12:00:00.000Z'),
      hours: 1,
    });
    expect(slots).toEqual([]);
  });

  it('drops a slot that overlaps a busy interval or an unexpired hold', () => {
    const busy: TimeInterval[] = [
      { start: '2026-01-07T14:00:00.000Z', end: '2026-01-07T15:00:00.000Z' },
    ];
    const holds: HeldInterval[] = [
      {
        start: '2026-01-07T15:00:00.000Z',
        end: '2026-01-07T16:00:00.000Z',
        expiresAt: '2026-01-07T18:00:00.000Z',
      },
      {
        start: '2026-01-07T16:00:00.000Z',
        end: '2026-01-07T17:00:00.000Z',
        expiresAt: '2026-01-07T12:00:00.000Z',
      },
    ];
    const slots = generateConsultationSlots({
      from: winterFrom,
      to: winterTo,
      now: winterNow,
      hours: 1,
      busy,
      holds,
    });
    const starts = slots.map((slot) => slot.start);
    expect(starts).not.toContain('2026-01-07T14:00:00.000Z');
    expect(starts).not.toContain('2026-01-07T15:00:00.000Z');
    expect(starts).toContain('2026-01-07T16:00:00.000Z');
  });

  it('offers seven two-hour starts that still end by 17:00', () => {
    const slots = generateConsultationSlots({
      from: winterFrom,
      to: winterTo,
      now: winterNow,
      hours: 2,
    });
    expect(slots).toHaveLength(7);
    expect(slots[0]?.start).toBe('2026-01-07T14:00:00.000Z');
    expect(slots[0]?.end).toBe('2026-01-07T16:00:00.000Z');
    expect(slots[6]?.start).toBe('2026-01-07T20:00:00.000Z');
    expect(slots[6]?.end).toBe('2026-01-07T22:00:00.000Z');
  });
});
