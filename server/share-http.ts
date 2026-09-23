import { consultationDueCents } from '../app/lib/consultation-hours';
import { clientSlugFromHost } from '../app/lib/share-host';
import {
  buildStageBInvoice,
  InvoiceRejected,
  type StageBInvoice,
} from '../app/lib/stage-b-invoice';
import { type AuditEvent, type AuditLog, createAuditLog } from './audit-log';
import { type SessionEnv, verifySession } from './session';
import { readShareSeed, SHARE_SEED_FILES } from './share-seed';

const processAudit = createAuditLog();

export interface ShareDeps {
  readonly audit?: AuditLog;
  readonly env?: SessionEnv;
  readonly now?: () => string;
}

interface InvoiceBody {
  readonly attached?: unknown;
  readonly waive?: unknown;
  readonly role?: unknown;
  readonly consultationHours?: unknown;
}

function json(status: number, body: unknown, audit: AuditEvent): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-studio-audit': JSON.stringify(audit),
    },
  });
}

function text(status: number, body: string, audit: AuditEvent, contentType: string): Response {
  return new Response(body, {
    status,
    headers: {
      'content-type': contentType,
      'cache-control': 'private, no-store',
      'x-studio-audit': JSON.stringify(audit),
    },
  });
}

function tenantFromHost(request: Request): string {
  const host = request.headers.get('host') ?? '';
  return clientSlugFromHost(host) ?? '-';
}

function isSeedFile(file: string): boolean {
  return (SHARE_SEED_FILES as readonly string[]).includes(file);
}

function parseSharePath(pathname: string): { slug: string; file: string } | null {
  const match = pathname.match(/^\/(?:api\/)?share\/([^/]+)\/([^/]+)$/);
  if (!match) return null;
  let slug = '';
  let file = '';
  try {
    slug = decodeURIComponent(match[1] ?? '');
    file = decodeURIComponent(match[2] ?? '');
  } catch {
    return null;
  }
  if (!slug || !file || slug.includes('..') || file.includes('..')) return null;
  if (clientSlugFromHost(`${slug}.revealuistudio.com`) !== slug) return null;
  if (!isSeedFile(file)) return null;
  return { slug, file };
}

function depsOf(deps?: ShareDeps): { audit: AuditLog; env: SessionEnv } {
  return {
    audit: deps?.audit ?? processAudit,
    env: deps?.env ?? { ownerSession: process.env.STUDIO_OWNER_SESSION },
  };
}

async function readInvoiceBody(request: Request): Promise<InvoiceBody | null> {
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as InvoiceBody;
  } catch {
    return null;
  }
}

export async function handleShareRequest(request: Request, deps?: ShareDeps): Promise<Response> {
  const { audit, env } = depsOf(deps);
  const session = verifySession(request, env);
  const url = new URL(request.url);
  const tenant = tenantFromHost(request);

  if (url.pathname === '/api/session' && request.method === 'GET') {
    const event = audit.append({
      action: 'session.read',
      tenant,
      actor: session.role,
      decision: 'allow',
      reason: 'session',
    });
    return json(200, { role: session.role }, event);
  }

  if (url.pathname === '/api/invoice/stage-b') {
    if (request.method !== 'POST') {
      const event = audit.append({
        action: 'invoice.issue',
        tenant,
        actor: session.role,
        decision: 'deny',
        reason: 'method',
      });
      return json(405, { error: 'method' }, event);
    }

    const body = await readInvoiceBody(request);
    if (!body) {
      const event = audit.append({
        action: 'invoice.issue',
        tenant,
        actor: session.role,
        decision: 'deny',
        reason: 'body',
      });
      return json(400, { error: 'body' }, event);
    }

    // Body `role` is ignored. The session established above is the only actor.
    const hours = body.consultationHours === undefined ? 1 : body.consultationHours;
    let consultationList = 0;
    try {
      if (typeof hours !== 'number') throw new RangeError('consultation-hours');
      consultationList = consultationDueCents(hours);
    } catch {
      const event = audit.append({
        action: 'invoice.issue',
        tenant,
        actor: session.role,
        decision: 'deny',
        reason: 'hours',
      });
      return json(400, { error: 'hours' }, event);
    }

    const attached = body.attached === true;
    const waive = body.waive === true;
    try {
      const stageB: StageBInvoice = buildStageBInvoice({
        attached,
        waive,
        role: session.role,
      });
      const event = audit.append({
        action: 'invoice.issue',
        tenant,
        actor: session.role,
        decision: 'allow',
        reason: waive ? 'waive' : attached ? 'list' : 'off',
      });
      return json(
        200,
        {
          consultation: {
            hours,
            listCents: consultationList,
            dueCents: consultationList,
          },
          stageB,
        },
        event,
      );
    } catch (error) {
      const reason = error instanceof InvoiceRejected ? error.reason : 'integrity';
      const event = audit.append({
        action: 'invoice.issue',
        tenant,
        actor: session.role,
        decision: 'deny',
        reason,
      });
      const status = reason === 'guest-waive' ? 403 : 400;
      return json(status, { error: reason }, event);
    }
  }

  const share = parseSharePath(url.pathname);
  if (!share || request.method !== 'GET') {
    const event = audit.append({
      action: 'share.read',
      tenant,
      actor: session.role,
      decision: 'deny',
      reason: share ? 'method' : 'path',
    });
    return text(share ? 405 : 404, 'denied', event, 'text/plain; charset=utf-8');
  }

  const hostMatches = tenant === share.slug;
  if (session.role !== 'owner' && !hostMatches) {
    const event = audit.append({
      action: 'share.read',
      tenant: share.slug,
      actor: session.role,
      decision: 'deny',
      reason: 'tenant',
    });
    return text(403, 'denied', event, 'text/plain; charset=utf-8');
  }

  const seed = readShareSeed(share.slug, share.file);
  if (seed === null) {
    const event = audit.append({
      action: 'share.read',
      tenant: share.slug,
      actor: session.role,
      decision: 'deny',
      reason: 'missing',
    });
    return text(404, 'denied', event, 'text/plain; charset=utf-8');
  }

  if (seed.includes(`Client slug: ${share.slug}`) === false) {
    const event = audit.append({
      action: 'share.read',
      tenant: share.slug,
      actor: session.role,
      decision: 'deny',
      reason: 'integrity',
    });
    return text(404, 'denied', event, 'text/plain; charset=utf-8');
  }

  const event = audit.append({
    action: 'share.read',
    tenant: share.slug,
    actor: session.role,
    decision: 'allow',
    reason: 'seed',
  });
  return text(200, seed, event, 'text/plain; charset=utf-8');
}
