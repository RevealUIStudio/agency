import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router, RouterProvider } from '@revealui/router';
import { render } from '@testing-library/react';
import { type ComponentType, createElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { PROOF_GAP_NEXT_STEPS } from '@/content/proof-gap';
import { consultationActions } from '@/lib/consultation-actions';
import {
  calendarInviteDescription,
  confirmationText,
  consultationStageLine,
  STAGE_B_ADDON,
  STAGE_B_CHECKBOX,
  STAGE_B_DETAIL,
  STAGE_B_HELPER,
  STAGE_B_ON_ORDER,
} from '@/lib/consultation-buyer';
import { DOMAIN_PACK_PAGES, domainPackLines } from '@/lib/domain-pack';
import { ADAPTER_CATEGORIES, LAUNCH, PILOT } from '@/lib/engagements';
import { buildQuote } from '@/lib/quote';
import { buildStageBInvoice, DOMAIN_ADD_ON_LINE_ITEM } from '@/lib/stage-b-invoice';
import { HomePage } from '@/routes/HomePage';
import { ProcessPage } from '@/routes/ProcessPage';
import { shareRouteTable } from '@/routes/share/SharePages';
import { SHARE_SEED } from '../../../server/share-seed';
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

/** RouterProvider's props require children, which Biome rejects as a children prop. */
function renderInRouter(router: Router, page: ComponentType) {
  const provider = RouterProvider as unknown as (props: { router: Router }) => ReactNode;
  return createElement(provider, { router }, createElement(page));
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
    expect(trust).toContain('Those reports cover the vendor, not RevealUI Studio.');

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

  it('forbids Domain pack and Stage B in rendered buyer copy', () => {
    const retired = /\bdomain pack\b|\bstage b\b/i;
    const chunks: string[] = [
      STAGE_B_ADDON,
      STAGE_B_CHECKBOX,
      STAGE_B_DETAIL,
      STAGE_B_HELPER,
      STAGE_B_ON_ORDER,
      consultationStageLine(true),
      consultationStageLine(false),
      PILOT.description,
      ...PILOT.includes,
      LAUNCH.description,
      ...LAUNCH.includes,
      ...PROOF_GAP_NEXT_STEPS,
      consultationActions.create_checkout_session.description,
      DOMAIN_ADD_ON_LINE_ITEM,
    ];

    for (const outcome of ['consultation', 'plan', 'launch'] as const) {
      for (const stageB of [false, true]) {
        chunks.push(
          JSON.stringify(
            buildQuote({
              hoster: 'studio',
              outcome,
              places: 'one',
              stageB,
              viewerRole: 'guest',
            }),
          ),
        );
      }
    }
    chunks.push(
      JSON.stringify(
        buildQuote({
          hoster: 'studio',
          outcome: 'consultation',
          places: 'one',
          stageB: true,
          stageBWaive: true,
          viewerRole: 'owner',
        }),
      ),
    );

    const guestInvoice = buildStageBInvoice({ attached: true, waive: false, role: 'guest' });
    const ownerInvoice = buildStageBInvoice({ attached: true, waive: true, role: 'owner' });
    chunks.push(
      ...guestInvoice.lines.map((line) => line.label),
      ...ownerInvoice.lines.map((line) => line.label),
    );
    expect(guestInvoice.lines.map((line) => line.label)).toEqual(['Domain add-on: $297']);
    expect(DOMAIN_ADD_ON_LINE_ITEM).toBe('Domain add-on: $297');
    expect(STAGE_B_CHECKBOX).toBe(DOMAIN_ADD_ON_LINE_ITEM);

    const paid = {
      start: '2026-01-07T14:00:00.000Z',
      end: '2026-01-07T15:00:00.000Z',
      company: null,
      stage_b: true,
      meet_link: 'https://meet.google.com/lookup/buyer-copy',
    };
    chunks.push(confirmationText(paid), calendarInviteDescription(paid));
    chunks.push(
      confirmationText({ ...paid, stage_b: false }),
      calendarInviteDescription({ ...paid, stage_b: false }),
    );

    for (const page of DOMAIN_PACK_PAGES) {
      chunks.push(domainPackLines(page.id, 'demo').join('\n'));
    }
    for (const files of Object.values(SHARE_SEED)) {
      chunks.push(...Object.values(files));
    }
    for (const route of shareRouteTable('demo')) {
      chunks.push(route.meta.title, route.meta.description);
    }

    const router = new Router();
    router.registerRoutes([{ path: '/', component: HomePage }]);
    window.history.pushState({}, '', '/');
    const home = render(renderInRouter(router, HomePage));
    chunks.push(home.container.textContent ?? '');
    home.unmount();

    const process = render(createElement(ProcessPage));
    chunks.push(process.container.textContent ?? '');
    process.unmount();

    const shareRouter = new Router();
    shareRouter.registerRoutes(shareRouteTable('demo'));
    for (const route of shareRouteTable('demo')) {
      if (route.path.includes('*')) continue;
      window.history.pushState({}, '', route.path);
      const Page = shareRouter.match(route.path)?.route.component;
      if (!Page) throw new Error(`missing share route ${route.path}`);
      const view = render(renderInRouter(shareRouter, Page));
      chunks.push(view.container.textContent ?? '');
      view.unmount();
    }

    const hits = chunks.flatMap((text, index) => {
      const match = text.match(retired);
      return match ? [`${index}: ${match[0]}`] : [];
    });
    expect(hits).toEqual([]);
  });
});
