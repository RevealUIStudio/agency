import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { CONSULTATION_UNIT_CENTS } from '@/lib/consultation-hours';
import { STAGE_B_PRICE } from '@/lib/engagements';
import { clearSharePacks, createSharePack, type SharePack } from '@/lib/share-stage-b';
import { assertInvoiceIntegrity, STAGE_B_CENTS, type StageBInvoice } from '@/lib/stage-b-invoice';
import { createAuditLog } from '../audit-log';
import { handleShareRequest } from '../share-http';

const OWNER = 'owner-token-test';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function request(
  url: string,
  init?: { method?: string; token?: string; body?: unknown; host?: string },
): Request {
  const headers = new Headers();
  headers.set('host', init?.host ?? 'revealuistudio.com');
  if (init?.token) headers.set('authorization', `Bearer ${init.token}`);
  return new Request(url, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

async function call(
  url: string,
  init?: {
    method?: string;
    token?: string;
    body?: unknown;
    host?: string;
    packs?: readonly SharePack[];
  },
) {
  const audit = createAuditLog(() => '2026-09-23T00:00:00.000Z');
  const response = await handleShareRequest(request(url, init), {
    audit,
    env: { ownerSession: OWNER },
    packs: init?.packs,
  });
  const raw = await response.text();
  return { response, raw, audit };
}

describe('share server', () => {
  beforeEach(() => {
    clearSharePacks();
  });

  it('serves the demo seed only on the demo host', async () => {
    const allowed = await call('https://demo.revealuistudio.com/share/demo/pack.txt', {
      host: 'demo.revealuistudio.com',
    });
    expect(allowed.response.status).toBe(200);
    expect(allowed.raw).toContain('Client slug: demo');
    expect(allowed.raw).toContain('Route: /pack');
    const dns = await call('https://demo.revealuistudio.com/share/demo/dns.txt', {
      host: 'demo.revealuistudio.com',
    });
    expect(dns.response.status).toBe(200);
    expect(dns.raw).toContain('Route: /dns');
    expect(dns.raw).toContain('CNAME target: cname.vercel-dns.com');
    expect(dns.raw).toContain('The studio attaches the DNS.');
    const pathNote = await call('https://demo.revealuistudio.com/share/demo/path.txt', {
      host: 'demo.revealuistudio.com',
    });
    expect(pathNote.raw).toContain('Path A is the default');
    expect(allowed.response.headers.get('cache-control')).toBe('private, no-store');
    expect(allowed.audit.entries()[0]).toMatchObject({
      action: 'share.read',
      tenant: 'demo',
      actor: 'guest',
      decision: 'allow',
    });

    const crossed = await call('https://acme.revealuistudio.com/share/demo/pack.txt', {
      host: 'acme.revealuistudio.com',
    });
    expect(crossed.response.status).toBe(403);
    expect(crossed.raw).toBe('denied');
    expect(crossed.raw).not.toContain('Client slug: demo');
    expect(crossed.audit.entries()[0]).toMatchObject({
      decision: 'deny',
      reason: 'tenant',
      actor: 'guest',
    });

    const apex = await call('https://revealuistudio.com/share/demo/pack.txt', {
      host: 'revealuistudio.com',
    });
    expect(apex.response.status).toBe(403);
    expect(apex.raw).not.toContain('pack');
  });

  it('serves the same demo pack on a verified custom domain and refuses an unverified one', async () => {
    const live = createSharePack('demo', {
      customDomain: 'share.example.com',
      customDomainStatus: 'live',
    });
    const allowed = await call('https://share.example.com/share/demo/pack.txt', {
      host: 'share.example.com',
      packs: [live],
    });
    expect(allowed.response.status).toBe(200);
    expect(allowed.raw).toContain('Client slug: demo');
    expect(allowed.audit.entries()[0]).toMatchObject({ tenant: 'demo', decision: 'allow' });

    const pending = createSharePack('demo', {
      customDomain: 'share.example.com',
      customDomainStatus: 'pending_dns',
    });
    const denied = await call('https://share.example.com/share/demo/pack.txt', {
      host: 'share.example.com',
      packs: [pending],
    });
    expect(denied.response.status).toBe(403);
    expect(denied.raw).not.toContain('Client slug: demo');
  });

  it('does not publish tenant seeds as static public files', () => {
    expect(existsSync(path.join(repoRoot, 'public/share'))).toBe(false);
  });

  it('rejects path traversal and a query-string owner flag', async () => {
    const extra = await call('https://demo.revealuistudio.com/share/demo/pack.txt.bak', {
      host: 'demo.revealuistudio.com',
    });
    expect(extra.response.status).toBe(404);
    expect(extra.raw).not.toContain('Client slug');

    const normalized = await call('https://demo.revealuistudio.com/share/demo/../acme/pack.txt', {
      host: 'demo.revealuistudio.com',
    });
    expect(normalized.response.status).toBe(403);
    expect(normalized.raw).toBe('denied');
    expect(normalized.raw).not.toContain('Client slug');

    const queryOwner = await call(
      `https://acme.revealuistudio.com/share/demo/pack.txt?access_token=${OWNER}&role=owner`,
      { host: 'acme.revealuistudio.com' },
    );
    expect(queryOwner.response.status).toBe(403);
    expect(queryOwner.audit.entries()[0]?.actor).toBe('guest');
  });

  it('reads a seed from the rewrite landing and ignores a query that fights the path', async () => {
    const owner = await call('https://revealuistudio.com/api/share?slug=demo&file=home.txt', {
      host: 'revealuistudio.com',
      token: OWNER,
    });
    expect(owner.response.status).toBe(200);
    expect(owner.raw).toContain('Client slug: demo');
    expect(owner.raw).toContain('Route: /');
    expect(owner.audit.entries()[0]).toMatchObject({ actor: 'owner', decision: 'allow' });

    const guest = await call(
      'https://demo.revealuistudio.com/api/share/%5Bslug%5D/%5Bfile%5D?slug=demo&file=pack.txt',
      { host: 'demo.revealuistudio.com' },
    );
    expect(guest.response.status).toBe(200);
    expect(guest.raw).toContain('Denser living pack');
    expect(guest.response.headers.get('content-type')).toBe('text/plain; charset=utf-8');

    const crossed = await call(
      'https://acme.revealuistudio.com/api/share?slug=demo&file=pack.txt',
      {
        host: 'acme.revealuistudio.com',
      },
    );
    expect(crossed.response.status).toBe(403);
    expect(crossed.raw).toBe('denied');
    expect(crossed.raw).not.toContain('Client slug');

    const pathWins = await call(
      'https://demo.revealuistudio.com/share/demo/pack.txt?slug=acme&file=home.txt',
      { host: 'demo.revealuistudio.com' },
    );
    expect(pathWins.response.status).toBe(200);
    expect(pathWins.raw).toContain('Denser living pack');
    expect(pathWins.raw).not.toContain('Stage A shell');

    const traversal = await call(
      'https://demo.revealuistudio.com/api/share?slug=demo&file=..%2Fhome.txt',
      { host: 'demo.revealuistudio.com' },
    );
    expect(traversal.response.status).toBe(404);
    expect(traversal.raw).not.toContain('Client slug');
  });

  it('sends share URLs to the share function ahead of the SPA fallback', () => {
    const vercel = JSON.parse(readFileSync(path.join(repoRoot, 'vercel.json'), 'utf8')) as {
      rewrites: { source: string; destination: string }[];
    };
    const apiShare = vercel.rewrites.findIndex((rule) => rule.source === '/api/share/:slug/:file');
    const publicShare = vercel.rewrites.findIndex((rule) => rule.source === '/share/:slug/:file');
    const catchAll = vercel.rewrites.findIndex((rule) => rule.source === '/(.*)');
    expect(vercel.rewrites[apiShare]).toEqual({
      source: '/api/share/:slug/:file',
      destination: '/api/share?slug=:slug&file=:file',
    });
    expect(vercel.rewrites[publicShare]).toEqual({
      source: '/share/:slug/:file',
      destination: '/api/share?slug=:slug&file=:file',
    });
    expect(apiShare).toBeGreaterThanOrEqual(0);
    expect(publicShare).toBeGreaterThan(apiShare);
    expect(catchAll).toBeGreaterThan(publicShare);
    expect(existsSync(path.join(repoRoot, 'api/share.ts'))).toBe(true);
    expect(existsSync(path.join(repoRoot, 'api/share/[slug]/[file].ts'))).toBe(false);
  });

  it('lets the owner session read a tenant seed and records the actor', async () => {
    const owner = await call('https://revealuistudio.com/api/share/demo/home.txt', {
      host: 'revealuistudio.com',
      token: OWNER,
    });
    expect(owner.response.status).toBe(200);
    expect(owner.raw).toContain('Route: /');
    expect(owner.audit.entries()[0]).toMatchObject({ actor: 'owner', decision: 'allow' });

    const wrong = await call('https://revealuistudio.com/api/share/demo/home.txt', {
      host: 'revealuistudio.com',
      token: 'not-the-owner',
    });
    expect(wrong.response.status).toBe(403);
    expect(wrong.audit.entries()[0]?.actor).toBe('guest');
  });

  it('prices Consultation as $300 times N and refuses a guest waive', async () => {
    const quoted = await call('https://revealuistudio.com/api/invoice/stage-b', {
      method: 'POST',
      host: 'revealuistudio.com',
      body: { attached: true, waive: false, consultationHours: 3, role: 'owner' },
    });
    expect(quoted.response.status).toBe(200);
    const quotedBody = JSON.parse(quoted.raw) as {
      consultation: { hours: number; listCents: number; dueCents: number };
      stageB: StageBInvoice;
    };
    expect(quotedBody.consultation).toEqual({ hours: 3, listCents: 90_000, dueCents: 90_000 });
    expect(quotedBody.stageB.listCents).toBe(STAGE_B_CENTS);
    expect(quotedBody.stageB.creditCents).toBe(0);
    expect(quotedBody.stageB.dueCents).toBe(STAGE_B_CENTS);
    expect(quotedBody.stageB.lines.map((line) => line.kind)).toEqual(['list']);
    assertInvoiceIntegrity(quotedBody.stageB);

    const waived = await call('https://revealuistudio.com/api/invoice/stage-b', {
      method: 'POST',
      host: 'revealuistudio.com',
      body: { attached: true, waive: true, consultationHours: 1 },
    });
    expect(waived.response.status).toBe(403);
    expect(JSON.parse(waived.raw)).toEqual({ error: 'guest-waive' });
    expect(waived.raw).not.toContain('"creditCents":29700');
    expect(waived.audit.entries()[0]).toMatchObject({
      action: 'invoice.issue',
      decision: 'deny',
      reason: 'guest-waive',
      actor: 'guest',
    });
  });

  it('issues an owner waive as list price plus a matching credit', async () => {
    const waived = await call('https://revealuistudio.com/api/invoice/stage-b', {
      method: 'POST',
      host: 'demo.revealuistudio.com',
      token: OWNER,
      body: { attached: true, waive: true, consultationHours: 2 },
    });
    expect(waived.response.status).toBe(200);
    const body = JSON.parse(waived.raw) as {
      stageB: StageBInvoice;
      consultation: { dueCents: number };
    };
    expect(body.consultation.dueCents).toBe(CONSULTATION_UNIT_CENTS * 2);
    expect(body.stageB.listCents).toBe(29_700);
    expect(body.stageB.creditCents).toBe(29_700);
    expect(body.stageB.dueCents).toBe(0);
    expect(body.stageB.waivedBy).toBe('owner');
    expect(body.stageB.lines.map((line) => line.kind)).toEqual(['list', 'credit']);
    assertInvoiceIntegrity(body.stageB);
    expect(waived.audit.entries()[0]).toMatchObject({
      actor: 'owner',
      decision: 'allow',
      tenant: 'demo',
    });
  });

  it('keeps the add-on off when it is not attached', async () => {
    const off = await call('https://revealuistudio.com/api/invoice/stage-b', {
      method: 'POST',
      body: { attached: false, waive: false },
    });
    const body = JSON.parse(off.raw) as { stageB: StageBInvoice };
    expect(off.response.status).toBe(200);
    expect(body.stageB.lines).toEqual([]);
    expect(body.stageB.dueCents).toBe(0);
    expect(body.stageB.listCents).toBe(0);
  });

  it('rejects a tampered invoice and an out-of-range hour count', () => {
    const tampered: StageBInvoice = {
      sku: 'stage-b',
      lines: [
        { kind: 'credit', sku: 'stage-b', label: 'Domain pack credit', amountCents: STAGE_B_CENTS },
      ],
      listCents: 0,
      creditCents: STAGE_B_CENTS,
      dueCents: 0,
      waivedBy: null,
    };
    expect(() => assertInvoiceIntegrity(tampered)).toThrow(/integrity/);

    return call('https://revealuistudio.com/api/invoice/stage-b', {
      method: 'POST',
      body: { attached: false, consultationHours: 0 },
    }).then((result) => {
      expect(result.response.status).toBe(400);
      expect(JSON.parse(result.raw)).toEqual({ error: 'hours' });
    });
  });

  it('does not claim a certification and does not name a SKU Hour', () => {
    expect(STAGE_B_PRICE).toBe('$297');
    expect(STAGE_B_CENTS).toBe(29_700);
    expect(CONSULTATION_UNIT_CENTS).toBe(30_000);
    const files = [
      'app/lib/quote.ts',
      'app/lib/consultation-hours.ts',
      'app/lib/stage-b-invoice.ts',
      'app/components/agency/QuoteCalculator.tsx',
      'server/share-http.ts',
      'server/share-seed.ts',
      'server/session.ts',
    ];
    for (const file of files) {
      const text = readFileSync(path.join(repoRoot, file), 'utf8');
      expect(text, file).not.toMatch(/\bHour\b/);
      expect(text, file).not.toMatch(/SOC ?2 certified/i);
      expect(text, file).not.toMatch(/SOC2 ready/i);
    }
  });
});
