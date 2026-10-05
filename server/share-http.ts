import { consultationDueCents } from '../app/lib/consultation-hours';
import { clientSlugFromHost, isConsultationDomainHost } from '../app/lib/share-host';
import {
  buildStageBInvoice,
  InvoiceRejected,
  type StageBInvoice,
} from '../app/lib/stage-b-invoice';
import { type AuditEvent, type AuditLog, createAuditLog } from './audit-log';
import { calendarFromEnv, consultationEnvFromProcess } from './consultation-calendar';
import {
  consultationSiteFromHost,
  type FulfillmentConfig,
  type FulfillmentDeps,
  FulfillmentError,
  fulfillConsultation,
} from './consultation-fulfillment';
import { type SessionEnv, verifySession } from './session';
import { readShareSeed, SHARE_SEED_FILES } from './share-seed';

const processAudit = createAuditLog();

export interface ShareDeps {
  readonly audit?: AuditLog;
  readonly env?: SessionEnv;
  readonly now?: () => string;
  readonly fulfillment?: FulfillmentDeps;
  readonly contentConfig?: FulfillmentConfig;
  readonly fetch?: typeof fetch;
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

function shareIdentity(slug: string, file: string): { slug: string; file: string } | null {
  if (!slug || !file || slug.includes('..') || file.includes('..')) return null;
  if (slug.includes('/') || file.includes('/') || slug.includes('\\') || file.includes('\\')) {
    return null;
  }
  if (clientSlugFromHost(`${slug}.revealuistudio.com`) !== slug) return null;
  if (!isSeedFile(file)) return null;
  return { slug, file };
}

function shareFromPathname(pathname: string): { slug: string; file: string } | null {
  const match = pathname.match(/^\/(?:api\/)?share\/([^/]+)\/([^/]+)$/);
  const slug = match?.[1];
  const file = match?.[2];
  if (!slug || !file) return null;
  try {
    return shareIdentity(decodeURIComponent(slug), decodeURIComponent(file));
  } catch {
    return null;
  }
}

function isShareRewriteLanding(pathname: string): boolean {
  if (pathname === '/api/share') return true;
  try {
    return decodeURIComponent(pathname) === '/api/share/[slug]/[file]';
  } catch {
    return false;
  }
}

function shareFromQuery(url: URL): { slug: string; file: string } | null {
  const slug = url.searchParams.get('slug');
  const file = url.searchParams.get('file');
  if (slug === null || file === null) return null;
  return shareIdentity(slug, file);
}

/**
 * Public paths are `/share/:slug/:file` and `/api/share/:slug/:file`.
 * Vite's catch-all rewrite serves index.html for those URLs because the
 * dynamic function file is not a filesystem match. vercel.json sends them to
 * `/api/share`, and that landing may replace `request.url`, so slug and file
 * are also accepted as a query string. A real path always wins over the query.
 */
function parseSharePath(url: URL): { slug: string; file: string } | null {
  const fromPath = shareFromPathname(url.pathname);
  if (fromPath) return fromPath;
  if (!isShareRewriteLanding(url.pathname)) return null;
  return shareFromQuery(url);
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

  if (isConsultationDomainHost(url.hostname)) {
    const event = (status: number, reason: string) =>
      audit.append({
        action: 'share.read',
        tenant: '-',
        actor: 'guest',
        decision: status < 400 ? 'allow' : 'deny',
        reason,
      });
    if (request.headers.get('host') && request.headers.get('host') !== url.host)
      return text(403, 'denied', event(403, 'domain-host'), 'text/plain; charset=utf-8');
    if (request.method !== 'GET' && request.method !== 'HEAD')
      return text(405, 'denied', event(405, 'method'), 'text/plain; charset=utf-8');
    const configured = consultationEnvFromProcess();
    try {
      const siteId = await consultationSiteFromHost(
        url.hostname,
        deps?.contentConfig ?? deps?.fulfillment?.config ?? { apiUrl: configured.contentApiUrl },
        deps?.fetch ?? deps?.fulfillment?.fetch,
      );
      if (!siteId)
        return text(404, 'denied', event(404, 'domain-missing'), 'text/plain; charset=utf-8');
      const recorded = event(303, 'private-viewer');
      return new Response(null, {
        status: 303,
        headers: {
          location: `https://admin.revealui.com/client-shares/${encodeURIComponent(siteId)}`,
          'cache-control': 'private, no-store',
          'x-robots-tag': 'noindex, nofollow',
          'x-studio-audit': JSON.stringify(recorded),
        },
      });
    } catch (error) {
      const status = error instanceof FulfillmentError ? error.status : 502;
      const reason = error instanceof FulfillmentError ? error.reason : 'content-unavailable';
      return text(status, 'denied', event(status, reason), 'text/plain; charset=utf-8');
    }
  }

  // This existing function owns operator share mutations. Clients read private
  // publications through central RevealUI auth; Studio never clones its cookies.
  if (url.pathname === '/api/share' && request.method === 'POST') {
    const respond = (status: number, body: unknown, reason: string) =>
      json(
        status,
        body,
        audit.append({
          action: 'consultation.fulfill',
          tenant: '-',
          actor: session.role,
          decision: status < 400 ? 'allow' : 'deny',
          reason,
        }),
      );
    if (session.role !== 'owner')
      return respond(403, { error: 'owner-required' }, 'owner-required');
    const configured = consultationEnvFromProcess();
    try {
      const studioOrigin = new URL(configured.publicSiteUrl ?? 'https://revealuistudio.com').origin;
      if (
        url.origin !== studioOrigin ||
        (request.headers.get('host') && request.headers.get('host') !== url.host)
      ) {
        return respond(403, { error: 'fulfillment-host' }, 'fulfillment-host');
      }
      const content = await request.text();
      if (content.length > 250000)
        return respond(413, { error: 'fulfillment-body' }, 'fulfillment-body');
      let body: unknown;
      try {
        body = JSON.parse(content);
      } catch {
        return respond(400, { error: 'fulfillment-body' }, 'fulfillment-body');
      }
      const calendar = deps?.fulfillment?.calendar ?? calendarFromEnv(configured);
      if (!calendar)
        return respond(503, { error: 'calendar-not-configured' }, 'calendar-not-configured');
      const result = await fulfillConsultation(
        body,
        deps?.fulfillment ?? {
          calendar,
          config: {
            apiUrl: configured.contentApiUrl,
            deviceToken: configured.contentDeviceToken,
            stripeSecretKey: configured.stripeSecretKey,
          },
        },
      );
      return respond(
        result.status === 'domain-pending-verification' ? 202 : 200,
        result,
        result.status,
      );
    } catch (error) {
      const status = error instanceof FulfillmentError ? error.status : 502;
      const reason = error instanceof FulfillmentError ? error.reason : 'fulfillment-unavailable';
      return respond(status, { error: reason, delivered: false }, reason);
    }
  }

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

  const share = parseSharePath(url);
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
