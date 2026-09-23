import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
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
  init?: { method?: string; token?: string; body?: unknown; host?: string },
) {
  const audit = createAuditLog(() => '2026-09-23T00:00:00.000Z');
  const response = await handleShareRequest(request(url, init), {
    audit,
    env: { ownerSession: OWNER },
  });
  const raw = await response.text();
  return { response, raw, audit };
}

describe('share server', () => {
  it('serves the omega seed only on the omega host', async () => {
    const allowed = await call('https://omega.revealuistudio.com/share/omega/pack.txt', {
      host: 'omega.revealuistudio.com',
    });
    expect(allowed.response.status).toBe(200);
    expect(allowed.raw).toContain('Client slug: omega');
    expect(allowed.raw).toContain('Route: /pack');
    expect(allowed.response.headers.get('cache-control')).toBe('private, no-store');
    expect(allowed.audit.entries()[0]).toMatchObject({
      action: 'share.read',
      tenant: 'omega',
      actor: 'guest',
      decision: 'allow',
    });

    const crossed = await call('https://acme.revealuistudio.com/share/omega/pack.txt', {
      host: 'acme.revealuistudio.com',
    });
    expect(crossed.response.status).toBe(403);
    expect(crossed.raw).toBe('denied');
    expect(crossed.raw).not.toContain('Client slug: omega');
    expect(crossed.audit.entries()[0]).toMatchObject({
      decision: 'deny',
      reason: 'tenant',
      actor: 'guest',
    });

    const apex = await call('https://revealuistudio.com/share/omega/pack.txt', {
      host: 'revealuistudio.com',
    });
    expect(apex.response.status).toBe(403);
    expect(apex.raw).not.toContain('pack');
  });

  it('does not publish tenant seeds as static public files', () => {
    expect(existsSync(path.join(repoRoot, 'public/share'))).toBe(false);
  });

  it('rejects path traversal and a query-string owner flag', async () => {
    const extra = await call('https://omega.revealuistudio.com/share/omega/pack.txt.bak', {
      host: 'omega.revealuistudio.com',
    });
    expect(extra.response.status).toBe(404);
    expect(extra.raw).not.toContain('Client slug');

    const normalized = await call('https://omega.revealuistudio.com/share/omega/../acme/pack.txt', {
      host: 'omega.revealuistudio.com',
    });
    expect(normalized.response.status).toBe(403);
    expect(normalized.raw).toBe('denied');
    expect(normalized.raw).not.toContain('Client slug');

    const queryOwner = await call(
      `https://acme.revealuistudio.com/share/omega/pack.txt?access_token=${OWNER}&role=owner`,
      { host: 'acme.revealuistudio.com' },
    );
    expect(queryOwner.response.status).toBe(403);
    expect(queryOwner.audit.entries()[0]?.actor).toBe('guest');
  });

  it('lets the owner session read a tenant seed and records the actor', async () => {
    const owner = await call('https://revealuistudio.com/api/share/omega/home.txt', {
      host: 'revealuistudio.com',
      token: OWNER,
    });
    expect(owner.response.status).toBe(200);
    expect(owner.raw).toContain('Route: /');
    expect(owner.audit.entries()[0]).toMatchObject({ actor: 'owner', decision: 'allow' });

    const wrong = await call('https://revealuistudio.com/api/share/omega/home.txt', {
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
      host: 'omega.revealuistudio.com',
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
      tenant: 'omega',
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
        { kind: 'credit', sku: 'stage-b', label: 'Stage B credit', amountCents: STAGE_B_CENTS },
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
