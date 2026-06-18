import { describe, expect, it } from 'vitest';
import { formatPressDate } from '../format';

describe('formatPressDate', () => {
  it('formats a valid date without producing "Invalid Date"', () => {
    const out = formatPressDate('2026-03-15');
    expect(out).not.toBe('Invalid Date');
    // Timezone-robust: assert the year is present rather than the exact day.
    expect(out).toContain('2026');
  });

  it('returns the raw string when the date is unparseable', () => {
    expect(formatPressDate('TBD')).toBe('TBD');
    expect(formatPressDate('2026-13-40')).toBe('2026-13-40');
  });
});
