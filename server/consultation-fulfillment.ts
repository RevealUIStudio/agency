/** Consultation delivery adapts the maintained Calendar and content owners. */
import { z } from 'zod';
import type { Booking } from '../app/lib/consultation-booking';
import type { CalendarPort } from './consultation-calendar';
import { refundedCheckoutFromStripe } from './consultation-stripe';
import { providerFetch } from './provider-http';

const Identifier = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const Material = z.string().trim().min(1).max(30000);
const DomainMaterial = z
  .object({
    dns: Material,
    path: Material,
    'proof-gap': Material,
    stack: Material,
    onboarding: Material,
    walkthrough: Material,
  })
  .strict();
const Identity = { bookingId: Identifier, buyerUserId: Identifier };
const Input = z.discriminatedUnion('action', [
  z
    .object({
      ...Identity,
      action: z.literal('prepare'),
      notes: Material,
      nextStep: Material,
      domainPack: DomainMaterial.optional(),
    })
    .strict(),
  z.object({ ...Identity, action: z.literal('publish'), sessionId: Identifier }).strict(),
  z.object({ ...Identity, action: z.literal('revoke') }).strict(),
  z.object({ ...Identity, action: z.literal('reconcile') }).strict(),
  z
    .object({
      ...Identity,
      action: z.literal('attach-domain'),
      hostname: z.string().trim().min(1).max(253),
    })
    .strict(),
  z.object({ ...Identity, action: z.literal('detach-domain') }).strict(),
  z
    .object({
      ...Identity,
      action: z.literal('resolve-domain-pack'),
      decision: z.enum(['retained', 'revoked']),
      chargeId: z.string().regex(/^ch_[a-zA-Z0-9]+$/),
    })
    .strict(),
]);
const Binding = z
  .object({
    version: z.literal(1),
    kind: z.literal('studio-consultation'),
    bookingId: Identifier,
    buyerUserId: Identifier,
  })
  .strict();
const Lifecycle = z
  .object({
    version: z.literal(1),
    revoked: z.boolean(),
    domainPackPurchased: z.boolean(),
    domainPack: z.enum(['entitled', 'unentitled', 'review_required', 'retained', 'revoked']),
    amountRefunded: z.number().int().nonnegative().safe(),
    chargeId: z
      .string()
      .regex(/^ch_[a-zA-Z0-9]+$/)
      .optional(),
  })
  .strict();
const Domain = z
  .object({
    hostname: z.string().min(1).max(253),
    provider: z.literal('vercel'),
    projectId: z.string().min(1),
    verifiedAt: z.string().datetime(),
  })
  .strict();
const Verification = z.array(
  z.object({ type: z.literal('TXT'), domain: z.string(), value: z.string() }).strict(),
);
const DomainDns = z
  .object({
    configuredBy: z.enum(['A', 'CNAME', 'http', 'dns-01']).nullable(),
    misconfigured: z.boolean(),
    acceptedChallenges: z.array(z.enum(['dns-01', 'http-01'])),
    recommendedCNAME: z.array(z.object({ rank: z.number(), value: z.string() }).strict()),
    recommendedIPv4: z.array(z.object({ rank: z.number(), value: z.array(z.string()) }).strict()),
  })
  .strict();
const DomainOperation = z.discriminatedUnion('status', [
  z
    .object({
      siteId: Identifier,
      status: z.literal('attached'),
      domain: Domain,
      customDomainAttached: z.literal(true),
    })
    .strict(),
  z
    .object({
      siteId: Identifier,
      status: z.literal('detached'),
      domain: z.null(),
      customDomainAttached: z.literal(false),
    })
    .strict(),
  z
    .object({
      siteId: Identifier,
      status: z.literal('pending-verification'),
      domain: z.null(),
      customDomainAttached: z.literal(false),
      hostname: z.string().min(1).max(253),
      verification: Verification.optional(),
      dns: DomainDns,
    })
    .strict(),
]);
const Site = z
  .object({
    id: Identifier,
    slug: z.string(),
    visibility: z.string(),
    status: z.string(),
    settings: z
      .object({
        consultation: Binding,
        consultationLifecycle: Lifecycle.optional(),
        consultationDomain: Domain.nullish(),
      })
      .passthrough(),
  })
  .passthrough();
const Block = z.object({
  id: z.string(),
  type: z.literal('text'),
  data: z.object({ content: z.string(), format: z.literal('plain') }),
});
const Page = z
  .object({
    id: Identifier,
    siteId: Identifier,
    slug: z.string(),
    title: z.string(),
    status: z.string(),
    blocks: z.array(Block),
  })
  .passthrough();
const Session = z
  .object({
    id: Identifier,
    siteId: Identifier,
    title: z.string(),
    status: z.enum(['open', 'published', 'discarded']),
  })
  .passthrough();
const User = z
  .object({
    id: Identifier,
    email: z.string(),
    emailVerified: z.literal(true),
    status: z.literal('active'),
    type: z.literal('human'),
  })
  .passthrough();

export interface FulfillmentConfig {
  readonly apiUrl?: string;
  /** Existing Studio device token, resolved to the canonical platform operator. */
  readonly deviceToken?: string;
  readonly stripeSecretKey?: string;
}
export interface FulfillmentDeps {
  readonly calendar: CalendarPort;
  readonly config: FulfillmentConfig;
  readonly fetch?: typeof fetch;
}
export class FulfillmentError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
  ) {
    super(reason);
  }
}
export interface FulfillmentResult {
  readonly status: string;
  readonly siteId: string;
  readonly delivered: boolean;
  readonly sessionId?: string;
  readonly url?: string;
  readonly customDomainAttached?: boolean;
  readonly domain?: z.infer<typeof Domain> | null;
  readonly hostname?: string;
  readonly verification?: z.infer<typeof Verification>;
  readonly dns?: z.infer<typeof DomainDns>;
  readonly decision?: 'retained' | 'revoked';
}

function contentOrigin(config: FulfillmentConfig) {
  if (!config.apiUrl) throw new FulfillmentError(503, 'content-not-configured');
  let origin: URL;
  try {
    origin = new URL(config.apiUrl);
  } catch {
    throw new FulfillmentError(503, 'content-not-configured');
  }
  if (
    origin.protocol !== 'https:' ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  ) {
    throw new FulfillmentError(503, 'content-not-configured');
  }
  return origin.origin;
}

/** No redirects: an API redirect must never carry the operator credential elsewhere. */
function contentClient(config: FulfillmentConfig, fetchImpl: typeof fetch) {
  const origin = contentOrigin(config);
  if (!/^rvui_dev_[a-f0-9]{64}$/.test(config.deviceToken ?? '')) {
    throw new FulfillmentError(503, 'content-not-configured');
  }
  return async (path: string, method = 'GET', body?: unknown): Promise<unknown> => {
    let response: Response;
    try {
      response = await providerFetch(
        `${origin}/api/content${path}`,
        {
          method,
          redirect: 'error',
          headers: {
            authorization: `Bearer ${config.deviceToken}`,
            'content-type': 'application/json',
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
        fetchImpl,
      );
    } catch {
      throw new FulfillmentError(502, 'content-unavailable');
    }
    if (!response.ok) {
      throw new FulfillmentError(
        response.status === 400 ? 400 : response.status === 409 ? 409 : 502,
        response.status === 409 ? 'content-conflict' : 'content-rejected',
      );
    }
    let result: unknown;
    try {
      result = await response.json();
    } catch {
      throw new FulfillmentError(502, 'content-invalid');
    }
    const envelope = z
      .object({ success: z.literal(true), data: z.unknown().optional() })
      .safeParse(result);
    if (!envelope.success) throw new FulfillmentError(502, 'content-invalid');
    return envelope.data.data;
  };
}

/** Public persisted mapping lookup sends no operator credential or incoming client state. */
export async function consultationSiteFromHost(
  hostname: string,
  config: FulfillmentConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  let response: Response;
  try {
    response = await providerFetch(
      `${contentOrigin(config)}/api/content/consultation-domain?hostname=${encodeURIComponent(hostname)}`,
      {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
      },
      fetchImpl,
    );
  } catch (error) {
    if (error instanceof FulfillmentError) throw error;
    throw new FulfillmentError(502, 'content-unavailable');
  }
  if (response.status === 404) return null;
  if (!response.ok) throw new FulfillmentError(502, 'content-rejected');
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new FulfillmentError(502, 'content-invalid');
  }
  return parse(
    z
      .object({ success: z.literal(true), data: z.object({ siteId: Identifier }).strict() })
      .strict(),
    body,
  ).data.siteId;
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new FulfillmentError(409, 'content-integrity');
  return result.data;
}

type ContentCall = ReturnType<typeof contentClient>;
async function findBoundSite(call: ContentCall, bookingId: string) {
  const rows = parse(
    z.array(Site),
    await call(`/sites?consultationBookingId=${encodeURIComponent(bookingId)}&limit=2`),
  );
  if (rows.length > 1) throw new FulfillmentError(409, 'ambiguous-binding');
  const site = rows[0] ?? null;
  if (
    site &&
    (site.visibility !== 'private' || site.settings.consultation.bookingId !== bookingId)
  ) {
    throw new FulfillmentError(403, 'fulfillment-binding');
  }
  return site;
}
function packEntitled(booking: Booking) {
  return (
    booking.stage_b &&
    ['paid_addon', 'waived_network'].includes(booking.stage_b_fee) &&
    !booking.refund?.full &&
    !['review_required', 'revoked'].includes(booking.refund?.domainPackReview ?? '')
  );
}
function packPurchased(booking: Booking) {
  return booking.stage_b && ['paid_addon', 'waived_network'].includes(booking.stage_b_fee);
}
type SiteRecord = z.infer<typeof Site>;
async function updateLifecycle(
  call: ContentCall,
  site: SiteRecord,
  action: Record<string, unknown>,
) {
  const updated = parse(
    Site,
    await call(`/sites/${site.id}/consultation-lifecycle`, 'PUT', {
      bookingId: site.settings.consultation.bookingId,
      buyerUserId: site.settings.consultation.buyerUserId,
      ...action,
    }),
  );
  if (
    updated.id !== site.id ||
    updated.visibility !== 'private' ||
    updated.settings.consultation.bookingId !== site.settings.consultation.bookingId ||
    updated.settings.consultation.buyerUserId !== site.settings.consultation.buyerUserId ||
    !updated.settings.consultationLifecycle
  ) {
    throw new FulfillmentError(409, 'lifecycle-integrity');
  }
  return updated;
}
/** Persist current ledger evidence before page publication or membership changes.
 * The content owner atomically preserves revocation and higher refund amounts;
 * its read policy remains authoritative even when stale content writes finish.
 */
async function observeLifecycle(
  call: ContentCall,
  site: SiteRecord,
  booking: Booking | null,
  fallbackRefund?: { chargeId: string; amountRefunded: number; full: boolean },
) {
  if (booking && booking.booking_id !== site.settings.consultation.bookingId)
    throw new FulfillmentError(403, 'fulfillment-binding');
  const refund = booking?.refund ?? fallbackRefund;
  let updated = await updateLifecycle(call, site, {
    action: 'observe',
    revoked: booking?.status !== 'paid_scheduled' || Boolean(refund?.full),
    domainPackEntitled: booking ? packPurchased(booking) : false,
    ...(refund
      ? {
          refund: {
            chargeId: refund.chargeId,
            amountRefunded: refund.amountRefunded,
            full: refund.full,
          },
        }
      : {}),
  });
  // Ledger review is written first. A retry repairs an interrupted propagation
  // only against the exact persisted charge and cumulative provider amount.
  if (
    booking?.refund &&
    !updated.settings.consultationLifecycle?.revoked &&
    ['retained', 'revoked'].includes(booking.refund.domainPackReview)
  ) {
    updated = await updateLifecycle(call, updated, {
      action: 'resolve-domain-pack',
      chargeId: booking.refund.chargeId,
      amountRefunded: booking.refund.amountRefunded,
      decision: booking.refund.domainPackReview,
    });
  }
  return updated;
}
function lifecyclePackEntitled(site: SiteRecord) {
  return (
    Boolean(site.settings.consultationLifecycle?.domainPackPurchased) &&
    ['entitled', 'retained'].includes(site.settings.consultationLifecycle?.domainPack ?? '')
  );
}
async function revokeSite(call: ContentCall, site: z.infer<typeof Site>) {
  const revoked = await updateLifecycle(call, site, { action: 'revoke' });
  if (!revoked.settings.consultationLifecycle?.revoked)
    throw new FulfillmentError(409, 'revocation-incomplete');
  await call(`/sites/${site.id}/collaborators/${site.settings.consultation.buyerUserId}`, 'DELETE');
  const updated = parse(Site, await call(`/sites/${site.id}`, 'PATCH', { status: 'draft' }));
  if (updated.id !== site.id || updated.status !== 'draft' || updated.visibility !== 'private') {
    throw new FulfillmentError(409, 'revocation-incomplete');
  }
  return { status: 'revoked', siteId: site.id, delivered: false };
}
async function pauseDomainPages(call: ContentCall, siteId: string) {
  const pages = parse(z.array(Page), await call(`/sites/${siteId}/pages?limit=100`));
  for (const page of pages) {
    if (page.siteId !== siteId) throw new FulfillmentError(403, 'page-binding');
    if (Object.keys(DomainMaterial.shape).includes(page.slug) && page.status === 'published') {
      const updated = parse(Page, await call(`/pages/${page.id}`, 'PATCH', { status: 'draft' }));
      if (updated.id !== page.id || updated.siteId !== siteId || updated.status !== 'draft') {
        throw new FulfillmentError(409, 'domain-pack-pause-incomplete');
      }
    }
  }
}

/** Called only after signature/provider verification; ledger evidence is written first. */
export async function applyVerifiedRefund(
  evidence: {
    bookingId: string;
    stripeSessionId: string;
    chargeId: string;
    amountRefunded: number;
    full: boolean;
  },
  deps: FulfillmentDeps,
) {
  let booking = await deps.calendar.get(evidence.bookingId);
  if (booking)
    booking = await deps.calendar.recordRefund(
      evidence.bookingId,
      evidence.stripeSessionId,
      evidence,
    );
  const call = contentClient(deps.config, deps.fetch ?? fetch);
  let site = await findBoundSite(call, evidence.bookingId);
  if (!site) return { status: 'no-material', delivered: false };
  site = await observeLifecycle(call, site, booking, evidence);
  if (site.settings.consultationLifecycle?.revoked) return revokeSite(call, site);
  if (!lifecyclePackEntitled(site)) await pauseDomainPages(call, site.id);
  return {
    status:
      booking?.refund?.domainPackReview === 'retained'
        ? 'domain-pack-retained'
        : 'domain-pack-review',
    siteId: site.id,
    delivered: false,
  };
}

export async function fulfillConsultation(
  raw: unknown,
  deps: FulfillmentDeps,
): Promise<FulfillmentResult> {
  const input = Input.safeParse(raw);
  if (!input.success) throw new FulfillmentError(400, 'fulfillment-body');
  const body = input.data;
  const call = contentClient(deps.config, deps.fetch ?? fetch);
  let booking: Booking | null = null;
  let domainPackEntitled = false;
  if (body.action !== 'revoke' && body.action !== 'reconcile' && body.action !== 'detach-domain') {
    booking = await deps.calendar.get(body.bookingId);
    if (!booking || booking.booking_id !== body.bookingId)
      throw new FulfillmentError(404, 'booking-missing');
    if (booking.status !== 'paid_scheduled' || !booking.event_id || !booking.stripe_session_id) {
      throw new FulfillmentError(409, 'booking-unpaid');
    }
    if (booking.refund?.full) throw new FulfillmentError(409, 'booking-refunded');
    const buyer = parse(User, await call(`/users/${body.buyerUserId}`));
    if (
      buyer.id !== body.buyerUserId ||
      buyer.email.trim().toLowerCase() !== booking.email.trim().toLowerCase()
    ) {
      throw new FulfillmentError(403, 'buyer-mismatch');
    }
    domainPackEntitled = packEntitled(booking);
    if (body.action === 'prepare' && body.domainPack && !domainPackEntitled) {
      throw new FulfillmentError(403, 'domain-pack-not-purchased');
    }
  }

  // Read the maintained scoped collection, not a process registry. Unique booking
  // binding and slug in the DB resolve racing creates; retries rediscover the site.
  const findSite = async () => {
    const candidate = await findBoundSite(call, body.bookingId);
    if (!candidate) return null;
    if (
      candidate.visibility !== 'private' ||
      candidate.settings.consultation.bookingId !== body.bookingId ||
      candidate.settings.consultation.buyerUserId !== body.buyerUserId
    ) {
      throw new FulfillmentError(403, 'fulfillment-binding');
    }
    return candidate;
  };
  let site = await findSite();
  if (!site && body.action === 'prepare') {
    try {
      site = parse(
        Site,
        await call('/sites', 'POST', {
          name: 'Consultation materials',
          slug: `consultation-${body.bookingId.toLowerCase().replaceAll('_', '-')}`,
          status: 'draft',
          visibility: 'private',
          settings: {
            consultation: {
              version: 1,
              kind: 'studio-consultation',
              bookingId: body.bookingId,
              buyerUserId: body.buyerUserId,
            },
          },
        }),
      );
    } catch (error) {
      if (!(error instanceof FulfillmentError) || error.status !== 409) throw error;
      site = await findSite();
      if (!site) throw error;
    }
  }
  if (!site) throw new FulfillmentError(404, 'fulfillment-missing');
  if (
    site.visibility !== 'private' ||
    site.settings.consultation.bookingId !== body.bookingId ||
    site.settings.consultation.buyerUserId !== body.buyerUserId
  ) {
    throw new FulfillmentError(403, 'fulfillment-binding');
  }
  const siteId = site.id;
  if (body.action === 'revoke') {
    return revokeSite(call, site);
  }
  if (body.action === 'reconcile') {
    const booking = await deps.calendar.get(body.bookingId);
    site = await observeLifecycle(call, site, booking);
    if (site.settings.consultationLifecycle?.revoked) return revokeSite(call, site);
    if (!lifecyclePackEntitled(site)) await pauseDomainPages(call, siteId);
    return { status: 'reconciled', siteId, delivered: false };
  }
  if (body.action === 'detach-domain') {
    const result = parse(
      DomainOperation,
      await call(`/sites/${siteId}/consultation-domain`, 'DELETE'),
    );
    if (result.siteId !== siteId || result.status !== 'detached')
      throw new FulfillmentError(409, 'domain-integrity');
    return { ...result, status: 'domain-detached', delivered: false };
  }
  // Read after the persisted site exists: a refund that arrived before creation
  // had no material to mark. Later refunds can now always find this same binding.
  booking = await deps.calendar.get(body.bookingId);
  site = await observeLifecycle(call, site, booking);
  if (site.settings.consultationLifecycle?.revoked) {
    await revokeSite(call, site);
    throw new FulfillmentError(
      409,
      booking?.refund?.full ? 'booking-refunded' : 'fulfillment-revoked',
    );
  }
  if (
    !booking ||
    booking.booking_id !== body.bookingId ||
    !booking.event_id ||
    !booking.stripe_session_id
  ) {
    throw new FulfillmentError(409, 'booking-unpaid');
  }
  domainPackEntitled = lifecyclePackEntitled(site);
  if (body.action === 'attach-domain') {
    if (!domainPackEntitled) throw new FulfillmentError(403, 'domain-pack-not-purchased');
    const result = parse(
      DomainOperation,
      await call(`/sites/${siteId}/consultation-domain`, 'PUT', { hostname: body.hostname }),
    );
    if (result.siteId !== siteId || result.status === 'detached')
      throw new FulfillmentError(409, 'domain-integrity');
    return {
      ...result,
      status: result.status === 'attached' ? 'domain-attached' : 'domain-pending-verification',
      delivered: false,
    };
  }
  if (body.action === 'prepare' && body.domainPack && !domainPackEntitled)
    throw new FulfillmentError(403, 'domain-pack-not-purchased');
  if (body.action === 'resolve-domain-pack') {
    const evidence = await refundedCheckoutFromStripe(
      deps.config.stripeSecretKey,
      body.chargeId,
      deps.fetch ?? fetch,
    );
    if (!evidence || evidence.bookingId !== body.bookingId) {
      throw new FulfillmentError(409, 'refund-review-binding');
    }
    // Record a newer cumulative refund before resolving the current provider evidence.
    booking = await deps.calendar.recordRefund(body.bookingId, evidence.stripeSessionId, evidence);
    site = await observeLifecycle(call, site, booking);
    if (site.settings.consultationLifecycle?.revoked) {
      await revokeSite(call, site);
      throw new FulfillmentError(409, 'booking-refunded');
    }
    booking = await deps.calendar.resolveDomainPackRefund(
      body.bookingId,
      evidence.chargeId,
      evidence.amountRefunded,
      body.decision,
    );
    site = await observeLifecycle(call, site, booking);
    if (site.settings.consultationLifecycle?.domainPack !== body.decision)
      throw new FulfillmentError(409, 'refund-review-binding');
    if (body.decision === 'revoked') await pauseDomainPages(call, siteId);
    return {
      status: 'domain-pack-review-resolved',
      siteId,
      decision: body.decision,
      delivered: false,
    };
  }

  // Eligibility applies to the whole persisted publication, including material
  // from older sessions. A notes-only edit cannot reactivate a refunded pack.
  if (!domainPackEntitled) await pauseDomainPages(call, siteId);

  const pages = parse(z.array(Page), await call(`/sites/${siteId}/pages?limit=100`));
  if (pages.some((page) => page.siteId !== siteId)) throw new FulfillmentError(403, 'page-binding');
  const sessionTitle = 'Consultation delivery';
  if (body.action === 'prepare') {
    const sessions = parse(z.array(Session), await call(`/sessions?siteId=${siteId}&status=open`));
    if (sessions.some((session) => session.siteId !== siteId))
      throw new FulfillmentError(403, 'session-binding');
    const open = sessions.filter((session) => session.title === sessionTitle);
    if (open.length > 1) throw new FulfillmentError(409, 'ambiguous-draft');
    const session =
      open[0] ?? parse(Session, await call('/sessions', 'POST', { siteId, title: sessionTitle }));
    if (session.siteId !== siteId || session.status !== 'open')
      throw new FulfillmentError(403, 'session-binding');
    const material: Record<string, { title: string; content: string }> = {
      'session-notes': { title: 'Session notes', content: body.notes },
      'recommended-next-step': { title: 'Recommended next step', content: body.nextStep },
    };
    for (const [slug, content] of Object.entries(body.domainPack ?? {})) {
      material[slug] = { title: `Domain pack: ${slug}`, content };
    }
    for (const [slug, item] of Object.entries(material)) {
      let page = pages.find((candidate) => candidate.slug === slug);
      if (!page) {
        page = parse(
          Page,
          await call(`/sites/${siteId}/pages`, 'POST', {
            title: item.title,
            slug,
            path: `/${slug}`,
            status: 'draft',
            blocks: [
              {
                id: 'consultation-material',
                type: 'text',
                data: { content: item.content, format: 'plain' },
              },
            ],
          }),
        );
      }
      if (
        page.siteId !== siteId ||
        page.blocks.length !== 1 ||
        page.blocks[0]?.id !== 'consultation-material'
      ) {
        throw new FulfillmentError(409, 'page-integrity');
      }
      const docPath = `/sessions/${session.id}/docs/page/${page.id}`;
      await call(docPath, 'PATCH', { path: 'title', value: item.title });
      await call(docPath, 'PATCH', { path: 'blocks.0.data.content', value: item.content });
    }
    return { status: 'draft', siteId, sessionId: session.id, delivered: false };
  }

  const state = parse(
    z
      .object({
        session: Session,
        docs: z.array(z.object({ docType: z.string(), docId: Identifier, draft: z.unknown() })),
      })
      .passthrough(),
    await call(`/sessions/${body.sessionId}`),
  );
  if (
    state.session.siteId !== siteId ||
    state.session.title !== sessionTitle ||
    state.session.status === 'discarded'
  ) {
    throw new FulfillmentError(403, 'session-binding');
  }
  const required = ['session-notes', 'recommended-next-step'];
  for (const slug of required) {
    const page = pages.find((candidate) => candidate.slug === slug);
    if (!page || !state.docs.some((doc) => doc.docType === 'page' && doc.docId === page.id)) {
      throw new FulfillmentError(409, 'material-missing');
    }
  }
  if (
    state.docs.some((doc) => doc.docType !== 'page' || !pages.some((page) => page.id === doc.docId))
  ) {
    throw new FulfillmentError(403, 'publication-scope');
  }
  const allowedSlugs = [...required, ...Object.keys(DomainMaterial.shape)];
  if (
    state.docs.some((doc) => {
      const slug = pages.find((page) => page.id === doc.docId)?.slug ?? '';
      return !allowedSlugs.includes(slug) || (!required.includes(slug) && !domainPackEntitled);
    })
  )
    throw new FulfillmentError(403, 'publication-entitlement');
  for (const doc of state.docs) {
    const draft = z.object({ blocks: z.array(Block).length(1) }).safeParse(doc.draft);
    if (
      !draft.success ||
      draft.data.blocks[0]?.id !== 'consultation-material' ||
      !draft.data.blocks[0]?.data.content.trim()
    )
      throw new FulfillmentError(409, 'material-unready');
  }
  if (state.session.status === 'open') await call(`/sessions/${body.sessionId}/publish`, 'POST');
  const published = parse(z.array(Page), await call(`/sites/${siteId}/pages?limit=100`));
  if (
    state.docs.some(
      (doc) =>
        !published.some(
          (page) =>
            page.id === doc.docId &&
            page.siteId === siteId &&
            page.status === 'published' &&
            page.blocks.length === 1 &&
            page.blocks[0]?.data.content.trim(),
        ),
    )
  ) {
    throw new FulfillmentError(409, 'publication-incomplete');
  }
  const publication = parse(Site, await call(`/sites/${siteId}`, 'PATCH', { status: 'published' }));
  if (
    publication.id !== siteId ||
    publication.status !== 'published' ||
    publication.visibility !== 'private'
  ) {
    throw new FulfillmentError(409, 'publication-incomplete');
  }
  await call(`/sites/${siteId}/collaborators/${body.buyerUserId}`, 'PUT', { role: 'viewer' });
  site = await observeLifecycle(call, site, booking);
  if (site.settings.consultationLifecycle?.revoked) {
    await revokeSite(call, site);
    throw new FulfillmentError(409, 'fulfillment-revoked');
  }
  if (!lifecyclePackEntitled(site)) {
    await pauseDomainPages(call, siteId);
    if (
      state.docs.some(
        (doc) => !required.includes(pages.find((page) => page.id === doc.docId)?.slug ?? ''),
      )
    )
      throw new FulfillmentError(409, 'publication-entitlement');
  }
  return {
    status: 'published',
    siteId,
    sessionId: body.sessionId,
    delivered: true,
    url: `https://admin.revealui.com/client-shares/${encodeURIComponent(siteId)}`,
    customDomainAttached: Boolean(lifecyclePackEntitled(site) && site.settings.consultationDomain),
  };
}
