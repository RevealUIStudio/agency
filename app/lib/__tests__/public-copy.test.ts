import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  HERO_HEADLINE,
  HERO_SHOP_LINE,
  HERO_SUBLINE,
  HOME_DOCUMENT_TITLE,
  HOME_META_DESCRIPTION,
} from '@/components/agency/Hero';
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

function ascii85Decode(buf: Buffer): Buffer {
  let s = buf.toString('latin1').replace(/\s/g, '');
  if (s.endsWith('~>')) s = s.slice(0, -2);
  const out: number[] = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === 'z') {
      out.push(0, 0, 0, 0);
      i += 1;
      continue;
    }
    const chunk = s.slice(i, Math.min(i + 5, s.length));
    i += chunk.length;
    const pad = 5 - chunk.length;
    const padded = chunk + 'u'.repeat(pad);
    let n = 0;
    for (const ch of padded) n = n * 85 + (ch.charCodeAt(0) - 33);
    out.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
    if (pad) out.splice(out.length - pad, pad);
  }
  return Buffer.from(out);
}

/** ReportLab print PDFs store copy in an ASCII85+Flate content stream. */
function pdfPageText(pdf: Buffer): string {
  const start = pdf.indexOf(Buffer.from('stream\n'));
  const end = pdf.indexOf(Buffer.from('endstream'), start);
  if (start === -1 || end === -1) return pdf.toString('latin1');
  const raw = pdf.subarray(start + 'stream\n'.length, end);
  try {
    return inflateSync(ascii85Decode(raw)).toString('latin1');
  } catch {
    return pdf.toString('latin1');
  }
}

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
      expect(text).not.toMatch(/\$99/);
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
      path.join(repoRoot, 'app/routes/ProofGapPage.tsx'),
      path.join(repoRoot, 'app/content/guardrail.ts'),
      path.join(repoRoot, 'app/content/proof-gap.ts'),
      path.join(repoRoot, 'app/components/agency/ProofGapForm.tsx'),
      path.join(repoRoot, 'app/routes/ServicesPage.tsx'),
      path.join(repoRoot, 'app/components/agency/RevealFleet.tsx'),
      path.join(repoRoot, 'app/components/agency/WhoStudioIsFor.tsx'),
      path.join(repoRoot, 'app/components/agency/TrustRoadmap.tsx'),
      path.join(repoRoot, 'app/content/trust.ts'),
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
    const offers = readFileSync(path.join(repoRoot, 'app/lib/engagements.ts'), 'utf8');
    expect(offers).toContain("name: 'Consultation'");
    expect(offers).toContain("name: 'Pilot'");
    expect(offers).toContain("name: 'Launch'");
    expect(offers).toContain("'$1,500'");
    expect(offers).not.toMatch(/\$3,500/);
    expect(offers).not.toMatch(/\bdemo\b/i);
    expect(readFileSync(path.join(repoRoot, 'app/lib/quote.ts'), 'utf8')).not.toMatch(/\bSpec\b/);
  });

  it('does not sell live-or-holdback, four acceptance tests, or a first-half refund', () => {
    const files = [
      ...walk(path.join(repoRoot, 'app')),
      path.join(repoRoot, 'index.html'),
      path.join(repoRoot, 'README.md'),
    ];
    const banned =
      /live-or-holdback|four tests|signup-to-paid|first half back|make-good|receipted agent action/i;
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
    expect(nav).toContain('CIRCUIT_R_NAV_PX = 48');
    expect(nav).toContain('overflow-hidden');
    expect(nav).not.toContain('h-9 w-auto');
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
      'Tired of booking in one tab, invoices in another, and an agent in a third that leaves no receipt?',
    );
    expect(OG_CARD_HEADLINE).not.toBe(HERO_HEADLINE);
    expect(OG_CARD_HEADLINE).not.toBe(HERO_SHOP_LINE);
    expect(OG_CARD_SKU_LINE).toBe('Consultation $300. Pilot $1,500. Launch $7,500.');
    expect(OG_CARD_SKU_LINE).toBe(OG_CARD_SKU_FROM_OFFERS);
    expect(OG_CARD_BOOKING_LINE).toBe('Book a 30-minute intro on Google Calendar.');
    expect(OG_CARD_URL).toBe('revealuistudio.com');
    expect(hero).toContain(HERO_HEADLINE);
    expect(fixture).toContain(OG_CARD_HEADLINE);
    expect(fixture).toContain(OG_CARD_SKU_LINE);
    expect(fixture).toContain(OG_CARD_BOOKING_LINE);
    expect(generator).toContain(OG_CARD_HEADLINE);
    expect(generator).toContain(OG_CARD_SKU_LINE);
    expect(generator).toContain(OG_CARD_BOOKING_LINE);
    expect(generator).toContain('#060d1a');
    expect(fixture).not.toMatch(bannedRaster);
    expect(fixture).not.toMatch(/\bHour\b/);
    expect(fixture).not.toMatch(/Architecture artifact/);
    expect(fixture).not.toMatch(/\$3,500/);

    // Raster walk: utf-8 readFile of public/ misses PNG. tEXt chunks are
    // written by scripts/gen-og-card.mjs so the committed bytes stay honest.
    expect(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
    expect(pngLatin1).toContain(`Headline\0${OG_CARD_HEADLINE}`);
    expect(pngLatin1).toContain(`SkuLine\0${OG_CARD_SKU_LINE}`);
    expect(pngLatin1).toContain(`BookingLine\0${OG_CARD_BOOKING_LINE}`);
    expect(pngLatin1).not.toMatch(bannedRaster);
    expect(pngLatin1).not.toContain('A local studio for a site or booking flow.');
    expect(pngLatin1).not.toContain('Written plan $3,500');
    expect(pngLatin1).not.toContain('Hour $300');
    expect(pngLatin1).not.toContain('Architecture artifact bundle and review');
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
    expect(fleet).toContain('agentic business runtime');
    expect(fleet).toMatch(/Knowledge\s+Graph/);
    expect(fleet).toContain('Electric+CRDT');
    expect(fleet).toContain('not a Studio SKU');
    expect(fleet).not.toMatch(/Architecture Review/);
    expect(fleet).not.toMatch(/Knowledge Graph \$/);
    expect(fleet).toContain('{LEAD_PRODUCT} on revealui.com');
    expect(fleet).toContain('PRODUCT_SITE_URL');
    expect(fleet).not.toContain('REVVAULT_ROLE');
    expect(fleet).not.toContain('Pro Perpetual');
    expect(fleet).not.toMatch(/\$49|\$99/);
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
      path.join(repoRoot, 'app/routes/ProofGapPage.tsx'),
      path.join(repoRoot, 'app/content/proof-gap.ts'),
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
    const quote = readFileSync(path.join(repoRoot, 'app/lib/quote.ts'), 'utf8');
    expect(jsonLd).toContain(HOME_DOCUMENT_TITLE);
    expect(jsonLd).toContain(HOME_META_DESCRIPTION);
    expect(jsonLd).toContain(
      'The agentic business runtime startups operate on their own domain. Technical founders and small agencies who already run agents — existing tools report in, you keep the stack. Powerful + safe: agents leave receipts; catalog matches checkout. Consultation, Pilot, or Launch. Remote first. Book a 30-minute intro.',
    );
    expect(jsonLd).not.toContain('The agentic runtime startups operate on their own domain');
    expect(jsonLd).not.toContain('"name": "Knowledge Graph"');
    expect(jsonLd).not.toContain('"name": "Architecture Review"');
    expect(HERO_HEADLINE).toBe(
      'The agentic business runtime startups operate on their own domain.',
    );
    expect(hero).toContain('The agentic business runtime startups operate on their own domain.');
    expect(hero).not.toMatch(/HERO_HEADLINE = 'The agentic runtime startups/);
    expect(hero).toContain('existing tools report in, you keep the stack');
    expect(hero).toContain('agents leave receipts; catalog matches checkout');
    expect(hero).toContain('Powerful + safe');
    expect(hero).toContain(
      'Tired of Zap owning the critical path, agents that act without PROOF, and client updates with nothing receipted?',
    );
    expect(hero).toContain(
      'You already live in Cursor. I put booking, invoices, and agents with PROOF on your domain. You run it, or I ship it with you.',
    );
    expect(hero).toContain('HERO_MENU');
    expect(hero).toContain('WORKING_SESSION.name');
    expect(hero).toContain('WRITTEN_PLAN.name');
    expect(hero).toContain('LAUNCH_PACKAGE.name');
    expect(hero).not.toMatch(/Fortune 500|SOC ?2 certified|SOC2 ready|Maryville|Jobber|QBO/i);
    expect(hero).not.toMatch(/Meet the Fleet/i);
    expect(about).toContain('the agentic business runtime');
    expect(about).toMatch(/paid studio work:/);
    expect(about).toContain('{WORKING_SESSION.name}');
    expect(about).toContain('WRITTEN_PLAN.name');
    expect(about).toContain('LAUNCH_PACKAGE.name');
    expect(offers).toContain("name: 'Consultation'");
    expect(offers).toContain("name: 'Pilot'");
    expect(offers).toContain("name: 'Launch'");
    expect(jsonLd).toContain('"name": "Consultation"');
    expect(jsonLd).toContain('"name": "Pilot"');
    expect(jsonLd).toContain('"name": "Launch"');
    expect(jsonLd).toContain('"price": "300"');
    expect(jsonLd).toContain('"price": "1500"');
    expect(jsonLd).toContain('"price": "7500"');
    expect(jsonLd).not.toContain('"price": "3500"');
    expect(quote).toContain("DEFAULT_OUTCOME: Outcome = 'plan'");
    expect(quote).toContain("label: 'Consultation — diagnose the path / proof gap ($300)'");
    expect(quote).toContain("label: 'Pilot — one site, one agent I run, one receipted action'");
    expect(quote).toContain("label: 'Launch — money path live on my accounts'");
    expect(quote).toContain('PROOF means a receipted action');
    expect(quote).toContain('not outcome validation or proof of work');
    expect(quote).not.toMatch(/free website/i);
  });

  it('does not print retired public SKU titles on public routes', () => {
    const files = [
      ...walk(path.join(repoRoot, 'app/routes')),
      ...walk(path.join(repoRoot, 'app/components')),
      ...walk(path.join(repoRoot, 'app/content')),
      path.join(repoRoot, 'app/lib/engagements.ts'),
      path.join(repoRoot, 'app/lib/quote.ts'),
      path.join(repoRoot, 'app/lib/fleet.ts'),
      path.join(repoRoot, 'app/lib/og-card.ts'),
      path.join(repoRoot, 'scripts/gen-og-card.mjs'),
      path.join(repoRoot, 'index.html'),
    ];
    const bannedTitles =
      /Working session|Written plan|Architecture artifact|Architecture Review|Launch package|Live page/i;
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      if (bannedTitles.test(text) || /\bHour\b/.test(text)) {
        hits.push(path.relative(repoRoot, file));
      }
    }
    expect(hits).toEqual([]);
  });

  it('keeps Guardrail as Process microcopy inside the three-offer ladder', () => {
    const hero = readFileSync(path.join(repoRoot, 'app/components/agency/Hero.tsx'), 'utf8');
    const home = readFileSync(path.join(repoRoot, 'app/routes/HomePage.tsx'), 'utf8');
    const process = readFileSync(path.join(repoRoot, 'app/routes/ProcessPage.tsx'), 'utf8');
    const guardrail = readFileSync(path.join(repoRoot, 'app/content/guardrail.ts'), 'utf8');
    const offers = readFileSync(path.join(repoRoot, 'app/lib/engagements.ts'), 'utf8');
    const teasers = readFileSync(
      path.join(repoRoot, 'app/components/agency/ServiceTeasers.tsx'),
      'utf8',
    );

    expect(hero).toContain(HERO_SHOP_LINE);
    expect(hero).toContain('<h1');
    expect(hero).toContain('{HERO_SHOP_LINE}');
    expect(hero).not.toMatch(/guardrail company/i);
    expect(hero).not.toMatch(/GUARDRAIL_HEADING/);
    expect(home).not.toMatch(/GUARDRAIL_HEADING|guardrail-agent/);

    expect(process).toContain('GUARDRAIL_HEADING');
    expect(process).toContain('GUARDRAIL_BODY');
    expect(process).toContain('id="guardrail-agent"');
    expect(process).toContain('<aside');
    expect(process).not.toContain('<article id="guardrail-agent"');

    expect(guardrail).toContain("GUARDRAIL_HEADING = 'Guardrail agent (template)'");
    expect(guardrail).toContain('Keep agents honest on your domain.');
    expect(guardrail).toContain('Price locks, lane locks, receipts.');
    expect(guardrail).toContain('Included in how we scope Pilot and Launch.');
    expect(guardrail).toContain('Not a separate SKU.');
    expect(guardrail).not.toContain('\u2014');
    expect(guardrail).not.toMatch(/\$3,?500/);
    expect(guardrail).not.toMatch(/RevDev|RevForge/i);
    expect(guardrail).not.toMatch(/SOC ?2 certified/i);
    expect(guardrail).not.toMatch(/Maryville/i);

    expect(offers).toContain("name: 'Consultation'");
    expect(offers).toContain("name: 'Pilot'");
    expect(offers).toContain("name: 'Launch'");
    expect(offers).not.toMatch(/Guardrail/);
    expect(offers).not.toMatch(/\$3,?500/);
    expect(teasers).toContain('PUBLIC_OFFERS.map');
    expect(teasers).not.toMatch(/Guardrail/);
  });

  it('defines startups on the homepage and keeps Auditor trust copy honest', () => {
    const app = readFileSync(path.join(repoRoot, 'app/App.tsx'), 'utf8');
    const who = readFileSync(
      path.join(repoRoot, 'app/components/agency/WhoStudioIsFor.tsx'),
      'utf8',
    );
    const home = readFileSync(path.join(repoRoot, 'app/routes/HomePage.tsx'), 'utf8');
    const footer = readFileSync(path.join(repoRoot, 'app/components/Footer.tsx'), 'utf8');
    const hero = readFileSync(path.join(repoRoot, 'app/components/agency/Hero.tsx'), 'utf8');
    const trust = readFileSync(path.join(repoRoot, 'app/content/trust.ts'), 'utf8');
    const offers = readFileSync(path.join(repoRoot, 'app/lib/engagements.ts'), 'utf8');

    expect(app).not.toMatch(/what-is-a-startup/);
    expect(app).toContain('HOME_DOCUMENT_TITLE');
    expect(app).toContain('HOME_META_DESCRIPTION');
    expect(HOME_DOCUMENT_TITLE).toBe(
      'RevealUI Studio | The agentic business runtime startups operate on their own domain',
    );
    expect(HOME_META_DESCRIPTION).toContain(HERO_HEADLINE);
    expect(HOME_META_DESCRIPTION).toContain(HERO_SUBLINE);
    expect(HOME_META_DESCRIPTION).toContain('Consultation $300. Pilot $1,500. Launch $7,500.');
    expect(HOME_META_DESCRIPTION).toContain('agents leave receipts; catalog matches checkout');
    expect(HOME_META_DESCRIPTION).toContain('Powerful + safe');
    expect(HOME_META_DESCRIPTION).not.toContain(HERO_SHOP_LINE);
    expect(HOME_DOCUMENT_TITLE).not.toContain('Tired of');
    expect(app).not.toContain('The agentic runtime startups operate on their own domain');
    expect(home).toContain('WhoStudioIsFor');
    expect(home).toContain('TrustRoadmap');
    expect(who).toContain("STUDIO_FOR_TITLE = 'Who Studio is for'");
    expect(who).toContain(
      'Small agencies: stop disclosing work your agents can’t receipt. Pilot and Launch leave PROOF on the client’s domain.',
    );
    expect(who).toMatch(/For: Technical founders and small agencies/i);
    expect(who).toMatch(/Not for: Hosted chatbot bolt-ons/);
    expect(who).toMatch(/The deal: You bring the domain/);
    expect(who).toMatch(/pay Launch to implement/);
    expect(who).toMatch(/Jobber swap/);
    expect(who).not.toMatch(/SOC ?2 certified|SOC2 ready|\baudited\b|SOC 2 compliant/i);
    expect(who).not.toMatch(/Fortune 500|high-stakes|regulated|mission-driven/i);

    expect(trust).toContain('RevealUI Studio is not SOC 2 or ISO 27001 certified today.');
    expect(trust).toContain('We are building toward SOC 2\\u2013capable controls');
    expect(trust).toContain('Neon (database)');
    expect(trust).toContain('Not claimed until a Studio report exists');
    expect(trust).toContain('Are you SOC 2 certified?');
    expect(trust).toContain('Not yet.');
    expect(trust).not.toMatch(/We are SOC ?2 certified/i);
    expect(trust).not.toMatch(/In audit/i);
    expect(trust).not.toMatch(/Our stack is SOC ?2 because Neon/i);
    expect(footer).not.toMatch(/SOC ?2/);
    expect(footer).not.toMatch(/Fortune 500/);
    expect(hero).not.toMatch(/SOC ?2|certified|ISO 27001/i);
    expect(hero).not.toMatch(/Fortune 500/);

    expect(offers).toContain("tagline: 'One site on your domain, one agent you run, you keep it'");
  });

  it('lists the process page in the public sitemap', () => {
    const sitemap = readFileSync(path.join(repoRoot, 'public/sitemap.xml'), 'utf8');
    expect(sitemap).toContain('https://revealuistudio.com/process');
    expect(sitemap).toContain('https://revealuistudio.com/proof-gap');
  });

  it('does not sell Contents or Videos as a live Studio CMS', () => {
    const files = [
      path.join(repoRoot, 'index.html'),
      path.join(repoRoot, 'app/App.tsx'),
      path.join(repoRoot, 'app/components/agency/Hero.tsx'),
      path.join(repoRoot, 'app/components/agency/QuoteCalculator.tsx'),
      path.join(repoRoot, 'app/components/agency/RevealFleet.tsx'),
      path.join(repoRoot, 'app/components/agency/ServiceTeasers.tsx'),
      path.join(repoRoot, 'app/lib/engagements.ts'),
      path.join(repoRoot, 'app/lib/quote.ts'),
      path.join(repoRoot, 'app/routes/AboutPage.tsx'),
      path.join(repoRoot, 'app/routes/HomePage.tsx'),
      path.join(repoRoot, 'app/routes/ProcessPage.tsx'),
      path.join(repoRoot, 'app/routes/ProofGapPage.tsx'),
      path.join(repoRoot, 'app/routes/ServicesPage.tsx'),
      path.join(repoRoot, 'app/content/proof-gap.ts'),
    ];
    const banned = /live Contents|Contents CMS|Videos CMS|unlimited admin collections/i;
    const hits: string[] = [];
    for (const file of files) {
      if (banned.test(readFileSync(file, 'utf8'))) {
        hits.push(path.relative(repoRoot, file));
      }
    }
    expect(hits).toEqual([]);
  });

  it('does not use relative product admin or signup paths', () => {
    const files = [...walk(path.join(repoRoot, 'app')), path.join(repoRoot, 'index.html')];
    const relativeAdmin = /(?:href|to)=['"`]\/(?:admin|signup|login)\b/;
    const hits: string[] = [];
    for (const file of files) {
      if (relativeAdmin.test(readFileSync(file, 'utf8'))) {
        hits.push(path.relative(repoRoot, file));
      }
    }
    expect(hits).toEqual([]);
  });

  it('names Knowledge Graph as runtime honesty, never a fourth cash-ladder SKU', () => {
    const offers = readFileSync(path.join(repoRoot, 'app/lib/engagements.ts'), 'utf8');
    const quote = readFileSync(path.join(repoRoot, 'app/lib/quote.ts'), 'utf8');
    const jsonLd = readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
    const hero = readFileSync(path.join(repoRoot, 'app/components/agency/Hero.tsx'), 'utf8');
    expect(offers).toContain("name: 'Consultation'");
    expect(offers).toContain("name: 'Pilot'");
    expect(offers).toContain("name: 'Launch'");
    expect(offers).not.toMatch(/name: 'Knowledge Graph'/);
    expect(offers).toContain('Knowledge Graph is part of the runtime (Electric+CRDT)');
    expect(offers).toContain('not a fourth Studio offer');
    expect(quote).toContain("label: 'Consultation — diagnose the path / proof gap ($300)'");
    expect(quote).toContain("label: 'Pilot — one site, one agent I run, one receipted action'");
    expect(quote).toContain("label: 'Launch — money path live on my accounts'");
    expect(quote).not.toMatch(/Knowledge Graph/);
    expect(quote).not.toMatch(/RevMind/);
    expect(jsonLd).not.toContain('"name": "Knowledge Graph"');
    expect(hero).not.toMatch(/Knowledge Graph/);
    expect(hero).not.toMatch(/RevMind/);
    expect(offers).not.toMatch(/Knowledge Graph \$\d/);
    expect(jsonLd).not.toMatch(/Knowledge Graph \$\d/);
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

  it('wires the proof-gap checklist as a soft lead-magnet gate', () => {
    const app = readFileSync(path.join(repoRoot, 'app/App.tsx'), 'utf8');
    const page = readFileSync(path.join(repoRoot, 'app/routes/ProofGapPage.tsx'), 'utf8');
    const copy = readFileSync(path.join(repoRoot, 'app/content/proof-gap.ts'), 'utf8');
    const footer = readFileSync(path.join(repoRoot, 'app/components/Footer.tsx'), 'utf8');
    const hero = readFileSync(path.join(repoRoot, 'app/components/agency/Hero.tsx'), 'utf8');
    const pdf = readFileSync(path.join(repoRoot, 'public/proof-gap-checklist.pdf'));
    const vercel = JSON.parse(readFileSync(path.join(repoRoot, 'vercel.json'), 'utf8')) as {
      rewrites: { source: string; destination: string }[];
    };

    expect(app).toContain('PROOF_GAP_PATH');
    expect(app).toContain('PROOF_GAP_DOCUMENT_TITLE');
    expect(app).toContain('ProofGapPage');
    expect(copy).toContain("PROOF_GAP_H1 = 'Can you prove what your agents did last week?'");
    expect(copy).toContain("PROOF_GAP_DOCUMENT_TITLE = 'Proof-gap checklist | RevealUI Studio'");
    expect(copy).toContain("PROOF_GAP_CTA = 'Get the free checklist'");
    expect(copy).toContain('PROOF is a receipted action');
    expect(copy).toContain('Consultation $300 · Pilot $1,500 · Launch $7,500');
    expect(copy).toContain('Not “faster than Zap.”');
    expect(copy).not.toMatch(/Request a quote/);
    expect(copy).not.toMatch(/revolutionize|empower|seamless/i);
    expect(copy).not.toMatch(/RevMind/);
    expect(copy).not.toMatch(/Architecture-as-Consultation/);
    expect(copy).not.toMatch(/PROOF_GAP_H1 = '.*faster than Zap/i);
    expect(page).toContain('PROOF_GAP_H1');
    expect(page).toContain('ProofGapForm');
    expect(footer).toContain('PROOF_GAP_PATH');
    expect(footer).toContain('PROOF_GAP_OFFER_NAME');
    expect(hero).not.toContain('Can you prove what your agents did last week?');
    expect(pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))).toBe(true);
    const pdfText = pdfPageText(pdf);
    expect(pdfText).toContain('Proof-gap checklist');
    expect(pdfText).toContain('RevealUI Studio');
    expect(pdfText).toMatch(/RevealUI Studio \\267 Proof-gap checklist/);
    expect(pdfText).not.toMatch(/HOLD public|Joshua OK|Media Manager|agency#204|publish OK/i);
    expect(
      vercel.rewrites.some(
        (rule) =>
          rule.source === '/proof-gap-checklist.pdf' &&
          rule.destination === '/proof-gap-checklist.pdf',
      ),
    ).toBe(true);
  });
});
