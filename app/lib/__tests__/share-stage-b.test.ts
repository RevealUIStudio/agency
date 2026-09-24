import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildQuote } from '@/lib/quote';
import {
  CHROME_LEVELS,
  CUSTOM_DOMAIN_CNAME_TARGET,
  createSharePack,
  customDomainTxtToken,
  resolveSharePackId,
  shareChrome,
  verifyCustomDomain,
  withCustomDomain,
} from '@/lib/share-stage-b';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('stage B share pack', () => {
  it('defaults chrome to studio and the custom domain to empty', () => {
    expect(createSharePack('omega')).toEqual({
      id: 'omega',
      slug: 'omega',
      customDomain: null,
      chromeLevel: 'studio',
      customDomainStatus: 'none',
    });
  });

  it('resolves the studio host and a verified custom host to the same pack id', () => {
    const draft = withCustomDomain(
      createSharePack('omega', { id: 'omega-pack' }),
      'share.example.com',
    );
    expect(draft.customDomain).toBe('share.example.com');
    expect(draft.customDomainStatus).toBe('pending_dns');
    expect(resolveSharePackId('share.example.com', [draft])).toBeNull();
    expect(resolveSharePackId('omega.revealuistudio.com', [draft])).toBe('omega-pack');

    const live = verifyCustomDomain(draft, {
      cname: `${CUSTOM_DOMAIN_CNAME_TARGET}.`,
      txt: customDomainTxtToken('share.example.com'),
    });
    expect(live.customDomainStatus).toBe('live');
    expect(resolveSharePackId('omega.revealuistudio.com', [live])).toBe('omega-pack');
    expect(resolveSharePackId('share.example.com', [live])).toBe('omega-pack');
    expect(resolveSharePackId('Share.Example.com:443', [live])).toBe('omega-pack');
  });

  it('does not resolve an unverified custom host', () => {
    const draft = withCustomDomain(
      createSharePack('omega', { id: 'omega-pack' }),
      'share.example.com',
    );
    const missed = verifyCustomDomain(draft, {
      cname: 'example.net',
      txt: customDomainTxtToken('share.example.com'),
    });
    expect(missed.customDomainStatus).toBe('pending_dns');
    expect(resolveSharePackId('share.example.com', [missed])).toBeNull();

    const wrongTxt = verifyCustomDomain(draft, {
      cname: CUSTOM_DOMAIN_CNAME_TARGET,
      txt: 'revealui-site-verification=other.example.com',
    });
    expect(wrongTxt.customDomainStatus).toBe('pending_dns');
    expect(resolveSharePackId('share.example.com', [wrongTxt])).toBeNull();

    const empty = verifyCustomDomain(createSharePack('omega'), {
      cname: CUSTOM_DOMAIN_CNAME_TARGET,
      txt: customDomainTxtToken('share.example.com'),
    });
    expect(empty.customDomainStatus).toBe('none');
    expect(resolveSharePackId('share.example.com', [empty])).toBeNull();
    expect(resolveSharePackId('omega.revealuistudio.com', [])).toBe('omega');
  });

  it('keeps the three chrome levels distinct', () => {
    const models = CHROME_LEVELS.map((level) => shareChrome('omega', level));
    const [studio, cobrand, white] = models;
    if (!studio || !cobrand || !white) throw new Error('missing chrome level');
    expect(shareChrome('omega').level).toBe('studio');
    expect(new Set(models.map((model) => model.subtitle)).size).toBe(3);
    expect(studio.showStudioMark).toBe(true);
    expect(studio.showStudioName).toBe(true);
    expect(studio.subtitle).toContain('Stage A');
    expect(cobrand.showStudioMark).toBe(true);
    expect(cobrand.showStudioName).toBe(true);
    expect(cobrand.subtitle).toContain('Co-brand');
    expect(white.showStudioMark).toBe(false);
    expect(white.showStudioName).toBe(false);
    expect(white.subtitle).toBe('Omega');
    expect(white.subtitle).not.toMatch(/RevealUI/);
  });

  it('prices Stage B as an optional Consultation add-on and includes it on Proof Sprint and Launch', () => {
    const off = buildQuote({
      hoster: 'studio',
      outcome: 'consultation',
      places: 'one',
    });
    expect(off.lines.some((line) => line.id.startsWith('stage-b'))).toBe(false);

    const on = buildQuote({
      hoster: 'studio',
      outcome: 'consultation',
      places: 'one',
      stageB: true,
      viewerRole: 'guest',
    });
    expect(on.lines.find((line) => line.id === 'stage-b-list')?.price).toBe('$297');
    expect(on.lines.some((line) => line.id === 'stage-b')).toBe(false);

    for (const outcome of ['plan', 'launch'] as const) {
      const quote = buildQuote({
        hoster: 'studio',
        outcome,
        places: 'one',
        stageB: true,
        viewerRole: 'guest',
      });
      const stage = quote.lines.filter((line) => line.id.startsWith('stage-b'));
      expect(stage.map((line) => line.price)).toEqual(['Included']);
      expect(JSON.stringify(stage)).not.toContain('$297');
      expect(JSON.stringify(stage)).not.toMatch(/\bwaived\b/i);
      expect(JSON.stringify(stage)).not.toMatch(/\bfree\b/i);
    }
  });

  it('does not say waived or free on Stage B public copy', () => {
    const files = [
      'app/lib/quote.ts',
      'app/lib/engagements.ts',
      'app/lib/share-stage-b.ts',
      'app/components/agency/QuoteCalculator.tsx',
      'app/components/share/ShareFrame.tsx',
      'app/components/share/CustomDomainDesk.tsx',
      'app/routes/share/SharePages.tsx',
      'server/share-seed.ts',
    ];
    const hits: string[] = [];
    for (const rel of files) {
      const lines = readFileSync(path.join(repoRoot, rel), 'utf8').split('\n');
      for (const [index, line] of lines.entries()) {
        if (!/stage b/i.test(line)) continue;
        if (/\bwaived\b/i.test(line) || /\bfree\b/i.test(line)) hits.push(`${rel}:${index + 1}`);
      }
    }
    expect(hits).toEqual([]);

    for (const outcome of ['consultation', 'plan', 'launch'] as const) {
      for (const stageB of [false, true]) {
        const quote = buildQuote({
          hoster: 'studio',
          outcome,
          places: 'one',
          stageB,
          viewerRole: 'guest',
        });
        const stage = quote.lines.filter((line) => line.id.startsWith('stage-b'));
        const blob = JSON.stringify(stage);
        expect(blob).not.toMatch(/\bwaived\b/i);
        expect(blob).not.toMatch(/\bfree\b/i);
      }
    }
  });

  it('does not call DNS or Vercel from the pack module or the desk', () => {
    const sources = ['app/lib/share-stage-b.ts', 'app/components/share/CustomDomainDesk.tsx'];
    for (const rel of sources) {
      const text = readFileSync(path.join(repoRoot, rel), 'utf8');
      expect(text, rel).not.toMatch(/\bfetch\s*\(/);
      expect(text, rel).not.toMatch(/node:dns|dns\.promises|vercel\.com\/api/i);
    }
  });
});
