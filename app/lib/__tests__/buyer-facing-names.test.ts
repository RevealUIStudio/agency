import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ADAPTER_CATEGORIES } from '@/lib/engagements';
import { findBannedToolNames, TOOL_CATEGORIES } from '../buyer-facing-names';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const launchKit = `docs/gap-specs/${'GAP'}-433-launch-kit.md`;

const SURFACES = [
  'app/content/trust.ts',
  'app/content/proof-gap.ts',
  'app/routes/ProcessPage.tsx',
  'app/routes/PrivacyPage.tsx',
  'app/routes/CookiesPage.tsx',
  'app/components/CookieConsent.tsx',
  'app/components/agency/Hero.tsx',
  'app/components/agency/WhoStudioIsFor.tsx',
  'app/App.tsx',
  'app/lib/engagements.ts',
  'app/lib/og-card.ts',
  'app/lib/quote.ts',
  'index.html',
  launchKit,
  'scripts/gen-og-card.mjs',
  'content/blog/registry.ts',
  'content/blog/README.md',
] as const;

function read(rel: string): string {
  return readFileSync(path.join(repoRoot, rel), 'utf8');
}

describe('buyer-facing tool names', () => {
  it('allows Google Calendar and Google Meet, and flags bare product names', () => {
    expect(findBannedToolNames('Book on Google Calendar or join Google Meet.')).toEqual([]);
    const hits = findBannedToolNames('Open Meet. Search Google. You already live in Cursor.');
    expect(hits.map((hit) => hit.name).sort()).toEqual(['Cursor', 'Google', 'Meet']);
    expect(hits.find((hit) => hit.name === 'Cursor')?.category).toBe('code editor');
    expect(hits.find((hit) => hit.name === 'Meet')?.category).toBe('scheduling tool');
  });

  it('keeps named tools off buyer-facing surfaces', () => {
    const essays = readdirSync(path.join(repoRoot, 'content/blog'))
      .filter((file) => file.endsWith('.md'))
      .map((file) => `content/blog/${file}`);
    for (const file of [...SURFACES, ...essays]) {
      const hits = findBannedToolNames(read(file));
      expect(hits, `${file} ${JSON.stringify(hits)}`).toEqual([]);
    }
  });

  it('describes trust, process, and the proof gap by category', () => {
    const trust = read('app/content/trust.ts');
    expect(trust).toContain('the database');
    expect(trust).toContain('the hosting provider');
    expect(trust).toContain('the payments processor');
    expect(trust).toContain('error telemetry');
    expect(trust).toContain('because a vendor is');

    const process = read('app/routes/ProcessPage.tsx');
    expect(process).toContain('hosting provider project');
    expect(process).toContain('AI model provider key');
    expect(process).toContain('Google Calendar');
    expect(process).toContain('Google Meet');

    const gap = read('app/content/proof-gap.ts');
    expect(gap).toContain('payments processor / DNS / source host / database');
    expect(gap).toContain('email provider / team chat');
    expect(gap).toContain('Google Meet');
  });

  it('keeps the public ladder and adapter categories', () => {
    const kit = read(launchKit);
    expect(kit).toContain('Pilot is $3,997');
    expect(kit).toContain('Launch is $14,500');
    expect(kit).not.toContain('Proof Sprint');
    expect(kit).not.toMatch(/alternative to/i);
    expect(ADAPTER_CATEGORIES).toBe(
      'field-service CRM / estimating / dispatch, gallery / proofing, shopping cart, phone / SMS, calendar, payments / wallets, or labs / fulfillment',
    );
    expect(read('app/components/agency/Hero.tsx')).not.toMatch(/\bCursor\b/);
    expect(read('scripts/gen-og-card.mjs')).toMatch(/Pilot \$3,997/);
    expect(TOOL_CATEGORIES).toEqual([
      'scheduling tool',
      'field-service CRM',
      'payments processor',
      'phone/SMS',
      'hosting provider',
      'database',
      'email provider',
      'code editor',
      'AI model provider',
    ]);
  });
});
