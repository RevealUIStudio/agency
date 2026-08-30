import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
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
    const files = [
      ...walk(path.join(repoRoot, 'app/routes')),
      path.join(repoRoot, 'app/content/receipt.ts'),
    ];
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

  it('does not sell the retired local-shop identity', () => {
    const files = [
      path.join(repoRoot, 'index.html'),
      path.join(repoRoot, 'app/App.tsx'),
      path.join(repoRoot, 'app/components/agency/Hero.tsx'),
      path.join(repoRoot, 'app/components/agency/ContactForm.tsx'),
      path.join(repoRoot, 'app/components/agency/QuoteCalculator.tsx'),
      path.join(repoRoot, 'app/components/agency/ServiceTeasers.tsx'),
      path.join(repoRoot, 'app/content/receipt.ts'),
      path.join(repoRoot, 'app/lib/engagements.ts'),
      path.join(repoRoot, 'app/lib/quote.ts'),
      path.join(repoRoot, 'app/lib/site.ts'),
      path.join(repoRoot, 'app/routes/AboutPage.tsx'),
      path.join(repoRoot, 'app/routes/ContactPage.tsx'),
      path.join(repoRoot, 'app/routes/HomePage.tsx'),
      path.join(repoRoot, 'app/routes/ProcessPage.tsx'),
      path.join(repoRoot, 'app/routes/ServicesPage.tsx'),
      path.join(repoRoot, 'app/components/agency/RevealFleet.tsx'),
      path.join(repoRoot, 'app/lib/fleet.ts'),
    ];
    const banned =
      /written plan|local studio|one-person software studio|call us|Alcoa|Architecture review artifact bundle|plus a demo|and a demo/i;
    const hits: string[] = [];
    for (const file of files) {
      if (banned.test(readFileSync(file, 'utf8'))) {
        hits.push(path.relative(repoRoot, file));
      }
    }
    expect(hits).toEqual([]);
    expect(readFileSync(path.join(repoRoot, 'app/lib/engagements.ts'), 'utf8')).toContain(
      'Architecture artifact bundle and review',
    );
    expect(readFileSync(path.join(repoRoot, 'app/lib/engagements.ts'), 'utf8')).not.toMatch(
      /\bdemo\b/i,
    );
    expect(readFileSync(path.join(repoRoot, 'app/lib/quote.ts'), 'utf8')).not.toMatch(/\bSpec\b/);
  });

  it('does not sell live-or-holdback, four acceptance tests, or a first-half refund', () => {
    const files = [
      ...walk(path.join(repoRoot, 'app')),
      path.join(repoRoot, 'index.html'),
      path.join(repoRoot, 'README.md'),
    ];
    const banned =
      /live-or-holdback|four tests|signup-to-paid|first half back|keep the stack|make-good|receipted agent action/i;
    const hits: string[] = [];
    for (const file of files) {
      if (banned.test(readFileSync(file, 'utf8'))) {
        hits.push(path.relative(repoRoot, file));
      }
    }
    expect(hits).toEqual([]);
  });

  it('serves the Circuit-R masters, not the faceted navy trace or old geometric R', () => {
    const favicon = readFileSync(path.join(repoRoot, 'public/favicon.svg'), 'utf8');
    const mark = readFileSync(path.join(repoRoot, 'public/revealui-mark.svg'), 'utf8');
    const nav = readFileSync(path.join(repoRoot, 'app/components/NavBar.tsx'), 'utf8');
    const pathCount = (mark.match(/<path/g) ?? []).length;
    const viaCount = (mark.match(/<circle/g) ?? []).length;
    expect(mark).toContain('viewBox="0 0 512 512"');
    expect(pathCount).toBeGreaterThanOrEqual(70);
    expect(viaCount).toBeGreaterThanOrEqual(50);
    expect(mark).toContain('Q207,159');
    expect(mark).not.toContain('M26 50');
    expect(mark).not.toContain('M34 11');
    expect(mark).not.toContain('viewBox="0 0 82 100"');
    expect(mark).not.toContain('fill="#003d94"');
    expect(mark).not.toContain('rx="22"');
    expect(mark).toBe(favicon);
    expect(nav).toContain('/revealui-mark.svg');
    expect(nav).toContain('h-9 w-auto');
    expect(nav).not.toContain('w-9');
    expect(nav).not.toContain('width={36}');
    expect(nav).not.toContain('/favicon.svg');
    expect(nav).not.toContain('/icon-mark.svg');
    expect(nav).not.toContain('wordmark');
    expect(readFileSync(path.join(repoRoot, 'index.html'), 'utf8')).toContain(
      '"logo": "https://revealuistudio.com/favicon.svg"',
    );

    // Leftover alternate marks from the faceted / tiled / mono / wordmark
    // families. #153 already dropped icon-mark.svg; keep the inventory shut.
    const leftoverMarks = [
      'public/icon-mark.svg',
      'public/icon-maskable.svg',
      'public/revealui-mark-mono.svg',
      'public/revealui-logo.svg',
      'public/revealui-logo-dark.svg',
      'public/wordmark-light.svg',
      'public/wordmark-dark.svg',
      'public/icon-192.png',
      'public/icon-512.png',
      'public/icon-maskable-512.png',
    ];
    expect(leftoverMarks.filter((rel) => existsSync(path.join(repoRoot, rel)))).toEqual([]);

    const publicNames = readdirSync(path.join(repoRoot, 'public'));
    expect(
      publicNames.filter((name) => /mark|logo|wordmark|favicon|icon/i.test(name)).sort(),
    ).toEqual(
      [
        'apple-touch-icon.png',
        'favicon.ico',
        'favicon.png',
        'favicon.svg',
        'revealui-mark.svg',
      ].sort(),
    );
  });

  it('keeps chrome free of a nav wordmark, a repeated email, and a raw docs host', () => {
    const nav = readFileSync(path.join(repoRoot, 'app/components/NavBar.tsx'), 'utf8');
    const footer = readFileSync(path.join(repoRoot, 'app/components/Footer.tsx'), 'utf8');
    expect(nav).not.toMatch(/RevealUI/);
    expect(nav).not.toMatch(/Studio/);
    expect(nav).not.toContain('CONTACT_EMAIL');
    expect(footer).toContain('Documentation');
    expect(footer).not.toMatch(/docs\.revealui\.com/);
    expect(footer.match(/mailto:\$\{CONTACT_EMAIL\}/g)?.length).toBe(1);
    expect(footer).toContain('STUDIO_LEGAL_NAME');
    expect(footer).not.toMatch(/\bLLC\b/);
    expect(footer).not.toMatch(/RevealUI Studio/);
    expect(footer).not.toMatch(
      /Working session|Written plan|Architecture artifact|Launch package|Fleet Stamp/,
    );
  });

  it('names the product family RevealFleet and does not sell parked fleet members', () => {
    const files = [
      path.join(repoRoot, 'app/routes/HomePage.tsx'),
      path.join(repoRoot, 'app/routes/AboutPage.tsx'),
      path.join(repoRoot, 'app/components/agency/RevealFleet.tsx'),
      path.join(repoRoot, 'app/components/agency/Hero.tsx'),
      path.join(repoRoot, 'app/lib/fleet.ts'),
    ];
    const banned =
      /RevFleet|revfleet|RevForge|RevKit|RevDev|Agency Perpetual|\$25,?000|8,?499|0\.2\.12/;
    const hits: string[] = [];
    for (const file of files) {
      if (banned.test(readFileSync(file, 'utf8'))) {
        hits.push(path.relative(repoRoot, file));
      }
    }
    expect(hits).toEqual([]);
    const fleet = readFileSync(
      path.join(repoRoot, 'app/components/agency/RevealFleet.tsx'),
      'utf8',
    );
    const facts = readFileSync(path.join(repoRoot, 'app/lib/fleet.ts'), 'utf8');
    expect(fleet).toContain('RevealFleet');
    expect(fleet).toContain('Buy {LEAD_PRODUCT}');
    expect(fleet).toContain('PRODUCT_SITE_URL');
    expect(fleet).toContain('REVVAULT_ROLE');
    expect(fleet).toContain('Pro Perpetual');
    expect(facts).toContain('RevVault');
    expect(facts).toMatch(/inside Pro/);
    expect(facts).toContain("proPerpetual: '$1,499'");
    expect(fleet).not.toMatch(/written plan/i);
    expect(fleet).not.toMatch(/\bSpec\b/);
    expect(fleet).not.toContain('\u2014');
  });

  it('does not list Enterprise as paid studio work', () => {
    const studioSurfaces = [
      path.join(repoRoot, 'app/components/agency/Hero.tsx'),
      path.join(repoRoot, 'app/routes/AboutPage.tsx'),
      path.join(repoRoot, 'app/routes/ProcessPage.tsx'),
      path.join(repoRoot, 'app/lib/engagements.ts'),
      path.join(repoRoot, 'app/lib/quote.ts'),
      path.join(repoRoot, 'app/components/agency/ServiceTeasers.tsx'),
      path.join(repoRoot, 'app/components/agency/ContactForm.tsx'),
      path.join(repoRoot, 'app/components/agency/QuoteCalculator.tsx'),
      path.join(repoRoot, 'index.html'),
    ];
    const hits: string[] = [];
    for (const file of studioSurfaces) {
      if (/Enterprise/.test(readFileSync(file, 'utf8'))) {
        hits.push(path.relative(repoRoot, file));
      }
    }
    expect(hits).toEqual([]);
    const hero = readFileSync(path.join(repoRoot, 'app/components/agency/Hero.tsx'), 'utf8');
    const about = readFileSync(path.join(repoRoot, 'app/routes/AboutPage.tsx'), 'utf8');
    const offers = readFileSync(path.join(repoRoot, 'app/lib/engagements.ts'), 'utf8');
    const jsonLd = readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
    expect(hero).toContain('Hour');
    expect(hero).toContain('Architecture artifact bundle and review');
    expect(hero).toContain('Launch');
    expect(about).toContain('Hour');
    expect(about).toMatch(/paid studio work: Hour/);
    expect(offers).toContain("name: 'Hour'");
    expect(jsonLd).toContain('"name": "Hour"');
  });

  it('does not print Working session on public routes', () => {
    const files = [
      ...walk(path.join(repoRoot, 'app/routes')),
      ...walk(path.join(repoRoot, 'app/components')),
      ...walk(path.join(repoRoot, 'app/content')),
      path.join(repoRoot, 'app/lib/engagements.ts'),
      path.join(repoRoot, 'app/lib/quote.ts'),
      path.join(repoRoot, 'app/lib/fleet.ts'),
      path.join(repoRoot, 'index.html'),
    ];
    const banned = /Working session/i;
    const hits: string[] = [];
    for (const file of files) {
      if (banned.test(readFileSync(file, 'utf8'))) {
        hits.push(path.relative(repoRoot, file));
      }
    }
    expect(hits).toEqual([]);
  });

  it('lists the process page in the public sitemap', () => {
    const sitemap = readFileSync(path.join(repoRoot, 'public/sitemap.xml'), 'utf8');
    expect(sitemap).toContain('https://revealuistudio.com/process');
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
