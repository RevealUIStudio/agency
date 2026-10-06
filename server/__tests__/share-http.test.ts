import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { CONSULTATION_UNIT_CENTS } from '@/lib/consultation-hours';
import { STAGE_B_PRICE } from '@/lib/engagements';
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
    fetch?: typeof fetch;
    apiUrl?: string;
    domainWaiveSecret?: string;
  },
) {
  const audit = createAuditLog(() => '2026-09-23T00:00:00.000Z');
  const response = await handleShareRequest(request(url, init), {
    audit,
    env: { ownerSession: OWNER, domainWaiveSecret: init?.domainWaiveSecret },
    fetch: init?.fetch,
    contentConfig: { apiUrl: init?.apiUrl },
  });
  const raw = await response.text();
  return { response, raw, audit };
}

describe('share server', () => {
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
    expect(pathNote.raw).toContain('recommended next step from the consultation');
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

  it.each([
    '/',
    '/share/demo/pack.txt',
    '/api/share?slug=demo&file=pack.txt',
  ])('resolves a persisted custom host at %s and redirects to the authenticated viewer', async (pathname) => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: { siteId: 'site-client' } })),
      );
    const audit = createAuditLog();
    const response = await handleShareRequest(
      new Request(`https://share.example.com${pathname}`, {
        headers: {
          host: 'share.example.com',
          authorization: `Bearer ${OWNER}`,
          cookie: 'revealui-session=client-secret',
        },
      }),
      {
        audit,
        env: { ownerSession: OWNER },
        contentConfig: { apiUrl: 'https://api.revealui.com', deviceToken: 'never-forward' },
        fetch: transport,
      },
    );
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      'https://admin.revealui.com/client-shares/site-client',
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(response.headers.has('set-cookie')).toBe(false);
    expect(await response.text()).toBe('');
    expect(transport).toHaveBeenCalledOnce();
    const [url, options] = transport.mock.calls[0] ?? [];
    expect(url).toBe(
      'https://api.revealui.com/api/content/consultation-domain?hostname=share.example.com',
    );
    expect(options).toMatchObject({
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
    });
    expect(new Headers(options?.headers).has('authorization')).toBe(false);
    expect(new Headers(options?.headers).has('cookie')).toBe(false);
    expect(options?.signal).toBeDefined();
    expect(audit.entries()[0]).toMatchObject({
      tenant: '-',
      actor: 'guest',
      decision: 'allow',
      reason: 'private-viewer',
    });
  });

  it.each([
    404, 403, 500,
  ])('denies a missing, revoked, or unavailable mapping (%s) without seed material', async (status) => {
    const denied = await call('https://share.example.com/share/demo/pack.txt', {
      host: 'share.example.com',
      apiUrl: 'https://api.revealui.com',
      fetch: async () => new Response('denied', { status }),
    });
    expect(denied.response.status).toBe(status === 404 ? 404 : 502);
    expect(denied.response.headers.has('location')).toBe(false);
    expect(denied.raw).toBe('denied');
    expect(denied.audit.entries()[0]?.decision).toBe('deny');
  });

  it.each([
    { success: true, data: { siteId: 'site-client', notes: 'private' } },
    { success: true, data: { siteId: '../other' } },
    { success: false, data: { siteId: 'site-client' } },
  ])('rejects an invalid lookup contract rather than trusting host labels or returned content', async (body) => {
    const denied = await call('https://share.example.com/', {
      host: 'share.example.com',
      apiUrl: 'https://api.revealui.com',
      fetch: async () => new Response(JSON.stringify(body)),
    });
    expect(denied.response.status).toBe(409);
    expect(denied.raw).toBe('denied');
  });

  it('denies unconfigured hosts, mismatched request hosts, and custom-host writes before lookup', async () => {
    const transport = vi.fn<typeof fetch>();
    const unconfigured = await call('https://share.example.com/', {
      host: 'share.example.com',
      fetch: transport,
    });
    expect(unconfigured.response.status).toBe(503);
    const spoofed = await call('https://share.example.com/', {
      host: 'other.example.com',
      apiUrl: 'https://api.revealui.com',
      fetch: transport,
    });
    expect(spoofed.response.status).toBe(403);
    const mutation = await call('https://share.example.com/api/share', {
      method: 'POST',
      token: OWNER,
      host: 'share.example.com',
      apiUrl: 'https://api.revealui.com',
      fetch: transport,
    });
    expect(mutation.response.status).toBe(405);
    expect(transport).not.toHaveBeenCalled();
  });

  it('rechecks the persisted mapping on each request so revocation cannot reuse a prior redirect', async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { siteId: 'site-client' } })),
      )
      .mockResolvedValueOnce(new Response('denied', { status: 404 }));
    const options = {
      host: 'share.example.com',
      apiUrl: 'https://api.revealui.com',
      fetch: transport,
    };
    expect((await call('https://share.example.com/', options)).response.status).toBe(303);
    const revoked = await call('https://share.example.com/', options);
    expect(revoked.response.status).toBe(404);
    expect(revoked.response.headers.has('location')).toBe(false);
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it('keeps transport failures and HEAD requests private', async () => {
    const failed = await call('https://share.example.com/', {
      host: 'share.example.com',
      apiUrl: 'https://api.revealui.com',
      fetch: async () => {
        throw new Error('provider unavailable');
      },
    });
    expect(failed.response.status).toBe(502);
    expect(failed.raw).toBe('denied');
    const head = await call('https://share.example.com/', {
      method: 'HEAD',
      host: 'share.example.com',
      apiUrl: 'https://api.revealui.com',
      fetch: async () =>
        new Response(JSON.stringify({ success: true, data: { siteId: 'site-client' } })),
    });
    expect(head.response.status).toBe(303);
    expect(head.raw).toBe('');
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
    expect(guest.raw).toContain('no completed Consultation or client material');
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
    expect(pathWins.raw).toContain('no completed Consultation or client material');
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

  it('routes client domain roots and nested paths through the maintained share function', () => {
    const vercel = JSON.parse(readFileSync(path.join(repoRoot, 'vercel.json'), 'utf8')) as {
      rewrites: {
        source: string;
        destination: string;
        missing?: { type: string; value: string }[];
      }[];
    };
    const alias = vercel.rewrites[0];
    expect(alias).toMatchObject({ source: '/:path*', destination: '/api/share' });
    expect(alias?.missing).toHaveLength(2);
    for (const host of ['share.example.com', 'client.co']) {
      expect(
        alias?.missing?.every((condition) => !new RegExp(`^${condition.value}$`).test(host)),
      ).toBe(true);
    }
    for (const host of [
      'revealuistudio.com',
      'demo.revealuistudio.com',
      'agency-git-main.vercel.app',
    ]) {
      expect(
        alias?.missing?.every((condition) => !new RegExp(`^${condition.value}$`).test(host)),
      ).toBe(false);
    }
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

    const unconfigured = await call('https://revealuistudio.com/api/invoice/stage-b', {
      method: 'POST',
      host: 'revealuistudio.com',
      token: OWNER,
      body: { attached: true, waive: true, consultationHours: 1 },
    });
    expect(unconfigured.response.status).toBe(503);
    expect(JSON.parse(unconfigured.raw)).toEqual({ error: 'waive-unconfigured' });
    expect(unconfigured.raw).not.toContain('"creditCents":29700');

    const waived = await call('https://revealuistudio.com/api/invoice/stage-b', {
      method: 'POST',
      host: 'revealuistudio.com',
      domainWaiveSecret: 'domain-waive-test',
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
      domainWaiveSecret: OWNER,
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
