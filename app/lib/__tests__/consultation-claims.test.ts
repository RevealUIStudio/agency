import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CONSULTATION_AFTER_PAY,
  CONSULTATION_BOOK_INTRO,
  CONSULTATION_CANCEL,
  CONSULTATION_SUCCESS,
  consultationStageLine,
  NETWORK_LINK_USED,
  STAGE_B_ADDON,
  STAGE_B_CHECKBOX,
  STAGE_B_DETAIL,
  STAGE_B_HELPER,
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
  it('does not use the retired public name Stage B on buyer screens', () => {
    const files = [
      ...walkTsx(path.join(repoRoot, 'app/components')),
      ...walkTsx(path.join(repoRoot, 'app/routes')),
      path.join(repoRoot, 'app/App.tsx'),
      path.join(repoRoot, 'app/lib/consultation-buyer.ts'),
    ];
    const hits: string[] = [];
    for (const file of files) {
      if (/\bStage B\b/.test(readFileSync(file, 'utf8'))) hits.push(path.relative(repoRoot, file));
    }
    expect(hits).toEqual([]);
  });

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
    expect(source).toContain('STAGE_B_HELPER');
    expect(source).not.toContain('STAGE_B_DETAIL');
    expect(source).not.toContain('Add the domain pack');
    expect(source).toContain('CONSULTATION_SUCCESS');
    expect(STAGE_B_CHECKBOX).toBe('Domain add-on: $297');
    expect(STAGE_B_HELPER).toBe(
      'Attach your own domain to the share host. Optional at Consultation; included with Pilot or Launch.',
    );
    expect(CONSULTATION_AFTER_PAY).toBe(
      'After payment, the Google Meet link is in the confirmation email and on the calendar invite.',
    );
    expect(CONSULTATION_SUCCESS).toBe(
      'Payment received. The Google Meet link is in your confirmation email and on the calendar invite.',
    );
    expect(CONSULTATION_CANCEL).toBe('No charge. The hold ends within 20 minutes.');
    for (const line of [
      STAGE_B_CHECKBOX,
      STAGE_B_HELPER,
      CONSULTATION_AFTER_PAY,
      CONSULTATION_SUCCESS,
      CONSULTATION_CANCEL,
      NETWORK_LINK_USED,
    ]) {
      expect(line).not.toContain('\u2014');
      expect(line.replaceAll('Google Meet', '')).not.toMatch(/\bMeet\b/);
    }
    expect(NETWORK_LINK_USED).toBe('This network Consultation link has already been used.');
  });

  it('keeps buyer strings free of a network fee leak', () => {
    const leak = /\bwaiv(e|ed)\b|\bfree Stage B\b|\bsometimes free\b/i;
    const lines = [
      CONSULTATION_BOOK_INTRO,
      STAGE_B_ADDON,
      STAGE_B_CHECKBOX,
      STAGE_B_HELPER,
      STAGE_B_DETAIL,
      STAGE_B_ON_ORDER,
      consultationStageLine(true),
      consultationStageLine(false),
      CONSULTATION_SUCCESS,
      NETWORK_LINK_USED,
    ];
    for (const line of lines) expect(line).not.toMatch(leak);
    expect(STAGE_B_ON_ORDER).toBe('Domain pack is on this order.');
  });
});
