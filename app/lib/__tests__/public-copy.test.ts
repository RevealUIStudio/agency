import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { engagementLabels } from '@/data/cases';
import {
  OG_CARD_BOOKING_LINE,
  OG_CARD_HEADLINE,
  OG_CARD_SKU_FROM_OFFERS,
  OG_CARD_SKU_LINE,
  OG_CARD_URL,
} from '@/lib/og-card';
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
      path.join(repoRoot, 'scripts/gen-og-card.mjs'),
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
      path.join(repoRoot, 'app/lib/og-card.ts'),
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
    // revealui test #2787 / f4ee0bac: optically centered v2 Circuit-R.
    expect(mark).toContain('translate(256,256) scale(1.06) translate(-300,-320)');
    expect(mark).not.toContain('translate(-330');
    expect(mark).toContain('mask="url(#cm)"');
    expect(mark).toContain('maskUnits="userSpaceOnUse"');
    expect(mark).toContain('#0a2c5a');
    expect(mark).toContain('#002247');
    expect(mark).toContain('#0e3468');
    expect(mark).toContain('#9fc9ff');
    expect(mark).toContain('#f0b519');
    expect(mark).not.toContain('#164687');
    expect(mark).not.toContain('#1e57a8');
    expect(mark).not.toContain('#e8f1ff');
    expect(mark).not.toContain('#f8fafd');
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

  it('keeps og-card.png on the live catalog, not the retired local-shop identity', () => {
    const fixture = readFileSync(path.join(repoRoot, 'app/lib/og-card.ts'), 'utf8');
    const generator = readFileSync(path.join(repoRoot, 'scripts/gen-og-card.mjs'), 'utf8');
    const hero = readFileSync(path.join(repoRoot, 'app/components/agency/Hero.tsx'), 'utf8');
    const png = readFileSync(path.join(repoRoot, 'public/og-card.png'));
    const pngLatin1 = png.toString('latin1');
    const bannedRaster =
      /written plan|local studio|one-person software studio|\bSpec\b|cal\.com|RevDev|RevForge|RevKit|Fleet Stamp/i;

    expect(OG_CARD_HEADLINE).toBe(
      'A product studio for runtime, receipts, a focused hour, an architecture artifact bundle and review, and a live launch.',
    );
    expect(OG_CARD_SKU_LINE).toBe(
      'Hour $300. Architecture artifact bundle and review $3,500. Launch $7,500.',
    );
    expect(OG_CARD_SKU_LINE).toBe(OG_CARD_SKU_FROM_OFFERS);
    expect(OG_CARD_BOOKING_LINE).toBe('Book a 30-minute intro on Google Calendar.');
    expect(OG_CARD_URL).toBe('revealuistudio.com');
    expect(hero.replace(/\s+/g, ' ')).toContain(OG_CARD_HEADLINE);
    expect(fixture).toContain(OG_CARD_HEADLINE);
    expect(fixture).toContain(OG_CARD_SKU_LINE);
    expect(fixture).toContain(OG_CARD_BOOKING_LINE);
    expect(generator).toContain(OG_CARD_HEADLINE);
    expect(generator).toContain(OG_CARD_SKU_LINE);
    expect(generator).toContain(OG_CARD_BOOKING_LINE);
    expect(generator).toContain('#060d1a');
    expect(fixture).not.toMatch(bannedRaster);

    // Raster walk: utf-8 readFile of public/ misses PNG. tEXt chunks are
    // written by scripts/gen-og-card.mjs so the committed bytes stay honest.
    expect(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
    expect(pngLatin1).toContain(`Headline\0${OG_CARD_HEADLINE}`);
    expect(pngLatin1).toContain(`SkuLine\0${OG_CARD_SKU_LINE}`);
    expect(pngLatin1).toContain(`BookingLine\0${OG_CARD_BOOKING_LINE}`);
    expect(pngLatin1).not.toMatch(bannedRaster);
    expect(pngLatin1).not.toContain('A local studio for a site or booking flow.');
    expect(pngLatin1).not.toContain('Written plan $3,500');
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
    expect(hero.replace(/\s+/g, ' ')).toContain(
      'A product studio for runtime, receipts, a focused hour, an architecture artifact bundle and review, and a live launch.',
    );
    expect(about.replace(/\s+/g, ' ')).toContain(
      'paid studio work: a focused hour, an architecture artifact bundle and review, and a live launch.',
    );
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
