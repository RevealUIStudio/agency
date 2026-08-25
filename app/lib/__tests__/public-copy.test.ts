import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { engagementLabels } from '@/data/cases';
import { INTRO_CALL_URL } from '@/lib/site';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const bannedBookingHost = new RegExp(`${'cal'}\\.com`, 'i');

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.git' || name === '__tests__') {
      continue;
    }
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full, acc);
      continue;
    }
    if (/\.(tsx?|html|xml|txt|json|md)$/.test(name)) acc.push(full);
  }
  return acc;
}

describe('public copy gates', () => {
  it('uses only the Google Calendar intro URL', () => {
    expect(INTRO_CALL_URL).toContain('calendar.google.com');
    expect(INTRO_CALL_URL).not.toMatch(bannedBookingHost);
  });

  it('has no third-party booking-host strings in the public tree', () => {
    const files = [
      ...walk(path.join(repoRoot, 'app')),
      ...walk(path.join(repoRoot, 'public')),
      path.join(repoRoot, 'index.html'),
      path.join(repoRoot, 'vercel.json'),
    ];
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      if (bannedBookingHost.test(text)) {
        hits.push(path.relative(repoRoot, file));
      }
    }
    expect(hits).toEqual([]);
  });

  it('does not print product-tier prices in the studio calculator', () => {
    const files = [
      path.join(repoRoot, 'app/lib/quote.ts'),
      path.join(repoRoot, 'app/components/agency/QuoteCalculator.tsx'),
    ];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(text).not.toMatch(/\$49/);
      expect(text).not.toMatch(/\$299/);
    }
  });

  it('keeps the About founder bio honest', () => {
    const about = readFileSync(path.join(repoRoot, 'app/routes/AboutPage.tsx'), 'utf8');
    expect(about).toContain('5+ years');
    expect(about).not.toMatch(/ten years/i);
    expect(about).not.toMatch(/AT&T|T-Mobile/i);
    expect(about).not.toMatch(/computer science|CS degree/i);
  });

  it('does not paint retired SKU titles on public routes', () => {
    const files = walk(path.join(repoRoot, 'app/routes'));
    const banned = /Fleet Stamp|Custom Build|AI Integration/;
    const hits: string[] = [];
    for (const file of files) {
      if (banned.test(readFileSync(file, 'utf8'))) {
        hits.push(path.relative(repoRoot, file));
      }
    }
    expect(hits).toEqual([]);
    const labels = Object.values(engagementLabels);
    expect(labels).not.toContain('Fleet Stamp');
    expect(labels).not.toContain('Custom Build');
    expect(labels).not.toContain('AI Integration');
    expect(labels).not.toContain('Architecture Review');
  });

  it('308s leftover catalog paths to the homepage calculator', () => {
    const vercel = JSON.parse(readFileSync(path.join(repoRoot, 'vercel.json'), 'utf8')) as {
      redirects: { source: string; destination: string; permanent: boolean }[];
    };
    const hops = vercel.redirects.filter((rule) =>
      ['/pricing', '/products', '/catalog'].includes(rule.source),
    );
    expect(hops).toHaveLength(3);
    for (const hop of hops) {
      expect(hop.destination).toBe('/#calculator');
      expect(hop.permanent).toBe(true);
    }
  });
});
