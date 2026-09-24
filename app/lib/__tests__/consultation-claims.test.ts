import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CONSULTATION_BOOK_INTRO,
  CONSULTATION_SUCCESS,
  consultationStageLine,
  STAGE_B_ADDON,
  STAGE_B_CHECKBOX,
  STAGE_B_DETAIL,
  STAGE_B_ON_ORDER,
} from '@/lib/consultation-buyer';

const repoRoot = path.resolve(import.meta.dirname, '../../..');

function walkTsx(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === '__tests__' || name === 'node_modules') continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      walkTsx(full, acc);
      continue;
    }
    if (name.endsWith('.tsx')) acc.push(full);
  }
  return acc;
}

describe('consultation public claims', () => {
  it('has no waive or free-fee copy on public screens', () => {
    const files = [
      ...walkTsx(path.join(repoRoot, 'app/components')),
      ...walkTsx(path.join(repoRoot, 'app/routes')),
    ];
    const banned = [/\bwaiv/i, /free consultation/i, /stage b is free/i, /free stage b/i];
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      if (banned.some((pattern) => pattern.test(text))) hits.push(path.relative(repoRoot, file));
    }
    expect(hits).toEqual([]);
  });

  it('does not send the book page at the 30-minute intro URL', () => {
    const source = readFileSync(path.join(repoRoot, 'app/routes/ConsultationBookPage.tsx'), 'utf8');
    expect(source).not.toContain('INTRO_CALL_URL');
    expect(source).not.toContain('calendar.google.com');
    expect(source).not.toContain('price_');
    expect(source).toContain('STAGE_B_CHECKBOX');
    expect(source).toContain('CONSULTATION_SUCCESS');
    expect(STAGE_B_CHECKBOX).toBe('Add the domain pack ($297)');
    expect(CONSULTATION_SUCCESS).toBe('Payment received. The Meet link is on the calendar invite.');
    expect(CONSULTATION_SUCCESS).not.toContain('—');
  });

  it('keeps buyer strings free of a network fee leak', () => {
    const leak = /\bwaiv(e|ed)\b|\bfree Stage B\b|\bsometimes free\b/i;
    const lines = [
      CONSULTATION_BOOK_INTRO,
      STAGE_B_ADDON,
      STAGE_B_CHECKBOX,
      STAGE_B_DETAIL,
      STAGE_B_ON_ORDER,
      consultationStageLine(true),
      consultationStageLine(false),
      CONSULTATION_SUCCESS,
    ];
    for (const line of lines) expect(line).not.toMatch(leak);
    expect(STAGE_B_ON_ORDER).toBe('Domain pack is on this order.');
  });
});
