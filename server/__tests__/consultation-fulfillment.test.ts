import { describe, expect, it } from 'vitest';
import type { Booking } from '@/lib/consultation-booking';
import { createMemoryCalendar } from '../consultation-calendar';
import { applyVerifiedRefund, fulfillConsultation } from '../consultation-fulfillment';
import { handleConsultationRequest } from '../consultation-http';
import { refundedCheckoutFromStripe, stripeSignatureHeader } from '../consultation-stripe';
import { handleShareRequest } from '../share-http';

const booking: Booking = {
  booking_id: 'book_delivery',
  start: '2026-10-08T14:00:00.000Z',
  end: '2026-10-08T15:00:00.000Z',
  hours: 1,
  name: 'Ada',
  email: 'ada@example.com',
  company: null,
  stage_b: false,
  stage_b_fee: 'none',
  network_jti: null,
  status: 'paid_scheduled',
  expires_at: '2026-10-08T14:00:00.000Z',
  event_id: 'event_delivery',
  meet_link: null,
  stripe_session_id: 'cs_delivery',
};
const identity = { bookingId: booking.booking_id, buyerUserId: 'buyer-1' };
const prepare = {
  ...identity,
  action: 'prepare',
  notes: 'Evidence from the session.',
  nextStep: 'Test the onboarding flow.',
};
const config = { apiUrl: 'https://api.revealui.com', deviceToken: `rvui_dev_${'a'.repeat(64)}` };
const paidDomainBooking: Booking = { ...booking, stage_b: true, stage_b_fee: 'paid_addon' };
const domain = {
  hostname: 'share.example.com',
  provider: 'vercel',
  projectId: 'prj_fixture',
  verifiedAt: '2026-10-05T12:00:00.000Z',
};
const pendingDomain = {
  status: 'pending-verification',
  domain: null,
  customDomainAttached: false,
  hostname: domain.hostname,
  verification: [
    { type: 'TXT', domain: '_vercel.share.example.com', value: 'vc-domain-verify=fixture' },
  ],
  dns: {
    configuredBy: null,
    misconfigured: true,
    acceptedChallenges: ['dns-01'],
    recommendedCNAME: [{ rank: 1, value: 'cname.vercel-dns.com' }],
    recommendedIPv4: [{ rank: 1, value: ['192.0.2.1'] }],
  },
};

// Synthetic remote owner, retained across fresh adapter instances. Nothing in
// production uses this fixture as a material, auth, or membership registry.
function contentFixture() {
  const sites: Record<string, unknown>[] = [];
  const pages: {
    id: string;
    siteId: string;
    slug: string;
    title: string;
    status: string;
    blocks: { id: string; type: string; data: { content: string; format: string } }[];
  }[] = [];
  const sessions: {
    id: string;
    siteId: string;
    title: string;
    status: string;
    docs: { docType: string; docId: string; draft: Record<string, unknown> }[];
  }[] = [];
  let grants = 0;
  let revisions = 0;
  let failGrant = false;
  let failPublish = false;
  let failRevoke = false;
  let domainPending = false;
  let buyer = {
    id: 'buyer-1',
    email: booking.email,
    type: 'human',
    status: 'active',
    emailVerified: true,
  };
  const requests: {
    method: string;
    path: string;
    redirect: RequestRedirect | undefined;
    authorization: string | null;
    body: unknown;
  }[] = [];
  const reply = (data: unknown, status = 200) =>
    new Response(JSON.stringify({ success: status < 400, data }), { status });
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname.replace('/api/content', '');
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    requests.push({
      method,
      path,
      redirect: init?.redirect,
      authorization: new Headers(init?.headers).get('authorization'),
      body,
    });
    if (method === 'GET' && path === '/users/buyer-1') return reply(buyer);
    if (path === '/sites' && method === 'GET') return reply(sites);
    if (path === '/sites' && method === 'POST') {
      const site = { id: `site-${sites.length + 1}`, ...body };
      sites.push(site);
      return reply(site, 201);
    }
    const sitePage = path.match(/^\/sites\/([^/]+)\/pages$/);
    if (sitePage && method === 'GET')
      return reply(pages.filter((page) => page.siteId === sitePage[1]));
    if (sitePage && method === 'POST') {
      const page = { id: `page-${pages.length + 1}`, siteId: sitePage[1], ...body };
      pages.push(page);
      return reply(page, 201);
    }
    if (path === '/sessions' && method === 'GET') {
      return reply(
        sessions.filter(
          (session) =>
            session.siteId === url.searchParams.get('siteId') && session.status === 'open',
        ),
      );
    }
    if (path === '/sessions' && method === 'POST') {
      const session = { id: `session-${sessions.length + 1}`, status: 'open', docs: [], ...body };
      sessions.push(session);
      return reply(session, 201);
    }
    const sessionPath = path.match(/^\/sessions\/([^/]+)(.*)$/);
    if (sessionPath) {
      const session = sessions.find((item) => item.id === sessionPath[1]);
      if (!session) return reply(null, 404);
      if (!sessionPath[2] && method === 'GET') return reply({ session, docs: session.docs });
      const docPath = sessionPath[2]?.match(/^\/docs\/page\/([^/]+)$/);
      if (docPath && method === 'PATCH') {
        const page = pages.find((item) => item.id === docPath[1]);
        if (!page || page.siteId !== session.siteId) return reply(null, 403);
        let doc = session.docs.find((item) => item.docId === page.id);
        if (!doc) {
          doc = { docType: 'page', docId: page.id, draft: structuredClone(page) };
          session.docs.push(doc);
        }
        if (body.path === 'title') doc.draft.title = body.value;
        else if (body.path === 'blocks.0.data.content') {
          const blocks = doc.draft.blocks as typeof page.blocks;
          if (blocks[0]) blocks[0].data.content = body.value;
        } else throw new Error(`Unexpected patch ${body.path}`);
        return reply(doc);
      }
      if (sessionPath[2] === '/publish' && method === 'POST') {
        if (failPublish) return reply(null, 409);
        for (const doc of session.docs) {
          const page = pages.find((item) => item.id === doc.docId);
          if (page) Object.assign(page, doc.draft, { status: 'published' });
          revisions += 1;
        }
        session.status = 'published';
        return reply(session);
      }
    }
    const lifecyclePath = path.match(/^\/sites\/([^/]+)\/consultation-lifecycle$/);
    if (lifecyclePath && method === 'PUT') {
      const site = sites.find((item) => item.id === lifecyclePath[1]);
      if (!site) return reply(null, 404);
      const settings = site.settings as {
        consultation: typeof identity;
        consultationLifecycle?: {
          version: 1;
          revoked: boolean;
          domainPackPurchased: boolean;
          domainPack: string;
          amountRefunded: number;
          chargeId?: string;
        };
      };
      if (
        settings.consultation.bookingId !== body.bookingId ||
        settings.consultation.buyerUserId !== body.buyerUserId
      )
        return reply(null, 409);
      const previous = settings.consultationLifecycle;
      const next: NonNullable<typeof settings.consultationLifecycle> = previous
        ? { ...previous }
        : {
            version: 1 as const,
            revoked: false,
            domainPackPurchased: body.domainPackEntitled === true,
            domainPack: body.domainPackEntitled ? 'entitled' : 'unentitled',
            amountRefunded: 0,
          };
      if (body.action === 'revoke') next.revoked = true;
      else if (body.action === 'observe') {
        next.revoked ||= body.revoked || body.refund?.full === true;
        next.domainPackPurchased &&= body.domainPackEntitled === true;
        if (body.refund) {
          if (next.chargeId && next.chargeId !== body.refund.chargeId) return reply(null, 409);
          if (body.refund.amountRefunded > next.amountRefunded) {
            next.chargeId = body.refund.chargeId;
            next.amountRefunded = body.refund.amountRefunded;
            next.domainPack = body.refund.full ? 'unentitled' : 'review_required';
          }
        }
        if (!next.domainPackPurchased && next.domainPack === 'entitled')
          next.domainPack = 'unentitled';
      } else if (body.action === 'resolve-domain-pack') {
        if (
          next.revoked ||
          next.chargeId !== body.chargeId ||
          next.amountRefunded !== body.amountRefunded ||
          (body.decision === 'retained' &&
            (next.domainPack === 'revoked' || !next.domainPackPurchased))
        )
          return reply(null, 409);
        next.domainPack = body.decision;
      } else throw new Error('Unexpected lifecycle action');
      settings.consultationLifecycle = next;
      return reply(site);
    }
    const domainPath = path.match(/^\/sites\/([^/]+)\/consultation-domain$/);
    if (domainPath && (method === 'PUT' || method === 'DELETE')) {
      const site = sites.find((item) => item.id === domainPath[1]);
      if (!site) return reply(null, 404);
      const settings = site.settings as Record<string, unknown>;
      if (method === 'DELETE') {
        settings.consultationDomain = null;
        return reply({
          siteId: site.id,
          status: 'detached',
          domain: null,
          customDomainAttached: false,
        });
      }
      if (domainPending) return reply({ siteId: site.id, ...pendingDomain }, 202);
      const attached = { ...domain, hostname: body.hostname };
      settings.consultationDomain = attached;
      return reply({
        siteId: site.id,
        status: 'attached',
        domain: attached,
        customDomainAttached: true,
      });
    }
    const sitePath = path.match(/^\/sites\/([^/]+)$/);
    if (sitePath && method === 'PATCH') {
      const site = sites.find((item) => item.id === sitePath[1]);
      if (!site) return reply(null, 404);
      Object.assign(site, body);
      return reply(site);
    }
    const pagePath = path.match(/^\/pages\/([^/]+)$/);
    if (pagePath && method === 'PATCH') {
      const page = pages.find((item) => item.id === pagePath[1]);
      if (!page) return reply(null, 404);
      Object.assign(page, body);
      return reply(page);
    }
    if (/^\/sites\/[^/]+\/collaborators\/buyer-1$/.test(path)) {
      if (method === 'PUT') {
        if (failGrant) return reply(null, 403);
        grants = 1;
      } else if (method === 'DELETE') {
        if (failRevoke) return reply(null, 500);
        grants = 0;
      } else throw new Error('Unexpected collaborator method');
      return new Response(JSON.stringify({ success: true }));
    }
    throw new Error(`Unexpected owner request ${method} ${path}`);
  };
  return {
    sites,
    pages,
    sessions,
    requests,
    fetchImpl,
    grants: () => grants,
    buyerCanRead: (slug = 'session-notes') => {
      const site = sites[0];
      const lifecycle = (
        site?.settings as
          | {
              consultationLifecycle?: {
                revoked: boolean;
                domainPackPurchased: boolean;
                domainPack: string;
              };
            }
          | undefined
      )?.consultationLifecycle;
      return (
        grants === 1 &&
        site?.status === 'published' &&
        lifecycle?.revoked === false &&
        pages.some((page) => page.slug === slug && page.status === 'published') &&
        (['session-notes', 'recommended-next-step'].includes(slug) ||
          (lifecycle.domainPackPurchased &&
            ['entitled', 'retained'].includes(lifecycle.domainPack)))
      );
    },
    revisions: () => revisions,
    buyer: (patch: Partial<typeof buyer>) => {
      buyer = { ...buyer, ...patch };
    },
    failGrant: () => {
      failGrant = true;
    },
    failPublish: () => {
      failPublish = true;
    },
    failRevoke: (value: boolean) => {
      failRevoke = value;
    },
    domainPending: (value: boolean) => {
      domainPending = value;
    },
  };
}

function stripeFixture(
  remote: ReturnType<typeof contentFixture>,
  amountRefunded: number,
  total = 30000,
  refundStatus = 'succeeded',
) {
  const provider: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith('https://api.stripe.com/v1/')) {
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer sk_test_fixture');
      expect(init?.redirect).toBe('error');
      expect(init?.signal).toBeDefined();
      const data = url.includes('/refunds?')
        ? {
            has_more: false,
            data: [
              {
                id: 're_refund',
                charge: 'ch_refund',
                amount: amountRefunded,
                currency: 'usd',
                status: refundStatus,
              },
            ],
          }
        : url.includes('/charges/')
          ? {
              id: 'ch_refund',
              payment_intent: 'pi_refund',
              amount: total,
              amount_refunded: amountRefunded,
              currency: 'usd',
            }
          : {
              has_more: false,
              data: [
                {
                  id: booking.stripe_session_id,
                  mode: 'payment',
                  payment_status: 'paid',
                  payment_intent: 'pi_refund',
                  amount_total: total,
                  metadata: { booking_id: booking.booking_id },
                },
              ],
            };
      return new Response(JSON.stringify(data));
    }
    return remote.fetchImpl(input, init);
  };
  return provider;
}

function deps(remote: ReturnType<typeof contentFixture>, record: Booking | null = booking) {
  return {
    calendar: createMemoryCalendar(record ? [record] : []),
    config,
    fetch: remote.fetchImpl,
  };
}

describe('private consultation fulfillment', () => {
  it('attaches through the persisted owner on fresh adapter calls without granting or publishing material', async () => {
    const remote = contentFixture();
    const draft = await fulfillConsultation(prepare, deps(remote, paidDomainBooking));
    const input = { ...identity, action: 'attach-domain', hostname: domain.hostname };
    const attached = await fulfillConsultation(input, deps(remote, paidDomainBooking));
    expect(attached).toEqual({
      status: 'domain-attached',
      siteId: draft.siteId,
      domain,
      customDomainAttached: true,
      delivered: false,
    });
    expect(await fulfillConsultation(input, deps(remote, paidDomainBooking))).toEqual(attached);
    expect(remote.grants()).toBe(0);
    expect(remote.revisions()).toBe(0);
    expect(remote.pages.every((page) => page.status === 'draft')).toBe(true);
    const writes = remote.requests.filter((request) =>
      request.path.endsWith('/consultation-domain'),
    );
    expect(writes).toHaveLength(2);
    expect(
      writes.every(
        (request) =>
          request.method === 'PUT' &&
          request.authorization === `Bearer ${config.deviceToken}` &&
          request.redirect === 'error',
      ),
    ).toBe(true);
    expect(writes.map((request) => request.body)).toEqual([
      { hostname: domain.hostname },
      { hostname: domain.hostname },
    ]);
    const published = await fulfillConsultation(
      { ...identity, action: 'publish', sessionId: draft.sessionId },
      deps(remote, paidDomainBooking),
    );
    expect(published.customDomainAttached).toBe(true);
    expect(published.url).toBe(`https://admin.revealui.com/client-shares/${draft.siteId}`);
  });

  it('preserves pending provider instructions and reports HTTP 202 until the owner verifies attachment', async () => {
    const remote = contentFixture();
    await fulfillConsultation(prepare, deps(remote, paidDomainBooking));
    remote.domainPending(true);
    const input = { ...identity, action: 'attach-domain', hostname: domain.hostname };
    const options = {
      env: { ownerSession: 'operator-test' },
      fulfillment: deps(remote, paidDomainBooking),
    };
    const request = () =>
      new Request('https://revealuistudio.com/api/share', {
        method: 'POST',
        headers: { host: 'revealuistudio.com', authorization: 'Bearer operator-test' },
        body: JSON.stringify(input),
      });
    const pending = await handleShareRequest(request(), options);
    expect(pending.status).toBe(202);
    expect(await pending.json()).toEqual({
      ...pendingDomain,
      status: 'domain-pending-verification',
      siteId: 'site-1',
      delivered: false,
    });
    expect(
      (remote.sites[0]?.settings as Record<string, unknown> | undefined)?.consultationDomain,
    ).toBeUndefined();
    remote.domainPending(false);
    const attached = await handleShareRequest(request(), options);
    expect(attached.status).toBe(200);
    expect(await attached.json()).toMatchObject({
      status: 'domain-attached',
      domain,
      customDomainAttached: true,
      delivered: false,
    });
    expect(remote.grants()).toBe(0);
    expect(remote.revisions()).toBe(0);
  });

  it.each([
    { paid: true },
    { verified: true },
    { projectId: 'caller-project' },
    { domainPackEntitled: true },
  ])('rejects caller-supplied attachment evidence %j before any owner request', async (proof) => {
    const remote = contentFixture();
    await expect(
      fulfillConsultation(
        { ...identity, action: 'attach-domain', hostname: domain.hostname, ...proof },
        deps(remote, paidDomainBooking),
      ),
    ).rejects.toMatchObject({ status: 400, reason: 'fulfillment-body' });
    expect(remote.requests).toHaveLength(0);
  });

  it.each([
    { record: booking, reason: 'domain-pack-not-purchased' },
    { record: { ...paidDomainBooking, status: 'slot_held' as const }, reason: 'booking-unpaid' },
    { record: null, reason: 'booking-missing' },
  ])('denies domain attachment without the current purchased booking: $reason', async ({
    record,
    reason,
  }) => {
    const remote = contentFixture();
    await fulfillConsultation(
      prepare,
      deps(remote, record === booking ? booking : paidDomainBooking),
    );
    await expect(
      fulfillConsultation(
        { ...identity, action: 'attach-domain', hostname: domain.hostname },
        deps(remote, record),
      ),
    ).rejects.toMatchObject({ reason });
    expect(remote.requests.some((request) => request.path.endsWith('/consultation-domain'))).toBe(
      false,
    );
  });

  it('rechecks buyer identity and immutable binding before requesting provider attachment', async () => {
    const remote = contentFixture();
    await fulfillConsultation(prepare, deps(remote, paidDomainBooking));
    remote.buyer({ email: 'other@example.com' });
    await expect(
      fulfillConsultation(
        { ...identity, action: 'attach-domain', hostname: domain.hostname },
        deps(remote, paidDomainBooking),
      ),
    ).rejects.toMatchObject({ reason: 'buyer-mismatch' });
    remote.buyer({ email: booking.email });
    const settings = remote.sites[0]?.settings as { consultation: typeof identity };
    settings.consultation.buyerUserId = 'foreign-buyer';
    await expect(
      fulfillConsultation(
        { ...identity, action: 'attach-domain', hostname: domain.hostname },
        deps(remote, paidDomainBooking),
      ),
    ).rejects.toMatchObject({ reason: 'fulfillment-binding' });
    expect(remote.requests.some((request) => request.path.endsWith('/consultation-domain'))).toBe(
      false,
    );
  });

  it('denies a revoked lifecycle even if Calendar still presents an older paid booking', async () => {
    const remote = contentFixture();
    await fulfillConsultation(prepare, deps(remote, paidDomainBooking));
    await fulfillConsultation({ ...identity, action: 'revoke' }, deps(remote, null));
    await expect(
      fulfillConsultation(
        { ...identity, action: 'attach-domain', hostname: domain.hostname },
        deps(remote, paidDomainBooking),
      ),
    ).rejects.toMatchObject({ reason: 'fulfillment-revoked' });
    expect(remote.requests.some((request) => request.path.endsWith('/consultation-domain'))).toBe(
      false,
    );
  });

  it.each([
    { siteId: 'foreign-site', status: 'attached', domain, customDomainAttached: true },
    { siteId: 'site-1', status: 'attached', domain, customDomainAttached: false },
    { siteId: 'site-1', status: 'detached', domain: null, customDomainAttached: false },
    { siteId: 'site-1', ...pendingDomain, customDomainAttached: true },
  ])('rejects a conflicting or malformed source attachment contract', async (operation) => {
    const remote = contentFixture();
    await fulfillConsultation(prepare, deps(remote, paidDomainBooking));
    const transport: typeof fetch = async (input, init) =>
      String(input).endsWith('/consultation-domain')
        ? new Response(JSON.stringify({ success: true, data: operation }))
        : remote.fetchImpl(input, init);
    await expect(
      fulfillConsultation(
        { ...identity, action: 'attach-domain', hostname: domain.hostname },
        { ...deps(remote, paidDomainBooking), fetch: transport },
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(remote.grants()).toBe(0);
  });

  it.each([
    400, 409, 500,
  ])('never reports attachment after a rejected provider-owner operation (%s)', async (status) => {
    const remote = contentFixture();
    await fulfillConsultation(prepare, deps(remote, paidDomainBooking));
    const transport: typeof fetch = async (input, init) =>
      String(input).endsWith('/consultation-domain')
        ? new Response(JSON.stringify({ success: false }), { status })
        : remote.fetchImpl(input, init);
    await expect(
      fulfillConsultation(
        { ...identity, action: 'attach-domain', hostname: domain.hostname },
        { ...deps(remote, paidDomainBooking), fetch: transport },
      ),
    ).rejects.toMatchObject({ status: status === 500 ? 502 : status });
    expect(
      (remote.sites[0]?.settings as Record<string, unknown> | undefined)?.consultationDomain,
    ).toBeUndefined();
  });

  it('detaches a persisted alias after cancellation without republishing or changing private notes', async () => {
    const remote = contentFixture();
    const draft = await fulfillConsultation(prepare, deps(remote, paidDomainBooking));
    await fulfillConsultation(
      { ...identity, action: 'publish', sessionId: draft.sessionId },
      deps(remote, paidDomainBooking),
    );
    await fulfillConsultation(
      { ...identity, action: 'attach-domain', hostname: domain.hostname },
      deps(remote, paidDomainBooking),
    );
    await fulfillConsultation({ ...identity, action: 'revoke' }, deps(remote, null));
    const pages = structuredClone(remote.pages);
    const revisions = remote.revisions();
    const context = deps(remote, null);
    context.calendar.get = async () => {
      throw new Error('cancelled Calendar record unavailable');
    };
    const detached = await fulfillConsultation({ ...identity, action: 'detach-domain' }, context);
    expect(detached).toEqual({
      status: 'domain-detached',
      siteId: draft.siteId,
      domain: null,
      customDomainAttached: false,
      delivered: false,
    });
    expect(remote.pages).toEqual(pages);
    expect(remote.revisions()).toBe(revisions);
    expect(remote.grants()).toBe(0);
    expect(
      (remote.sites[0]?.settings as Record<string, unknown> | undefined)?.consultationDomain,
    ).toBeNull();
    const result = await fulfillConsultation(
      { ...identity, action: 'detach-domain' },
      deps(remote, null),
    );
    expect(result).toEqual(detached);
    expect(
      remote.requests
        .filter(
          (request) => request.path.endsWith('/consultation-domain') && request.method === 'DELETE',
        )
        .map((request) => request.body),
    ).toEqual([{}, {}]);
  });

  it('requires the owner session for both attach and detach actions', async () => {
    const remote = contentFixture();
    await fulfillConsultation(prepare, deps(remote, paidDomainBooking));
    for (const action of ['attach-domain', 'detach-domain']) {
      const response = await handleShareRequest(
        new Request('https://revealuistudio.com/api/share', {
          method: 'POST',
          body: JSON.stringify({
            ...identity,
            action,
            ...(action === 'attach-domain' ? { hostname: domain.hostname } : {}),
          }),
        }),
        { env: { ownerSession: 'operator-test' }, fulfillment: deps(remote, paidDomainBooking) },
      );
      expect(response.status).toBe(403);
    }
    expect(remote.requests.some((request) => request.path.endsWith('/consultation-domain'))).toBe(
      false,
    );
  });

  it.each([
    'publish',
    'grant',
  ])('keeps a full refund revoked when an older %s finishes afterward', async (boundary) => {
    const remote = contentFixture();
    const context = deps(remote);
    const draft = await fulfillConsultation(prepare, context);
    let raced = false;
    const fetchImpl: typeof fetch = async (input, init) => {
      const path = new URL(String(input)).pathname;
      if (
        !raced &&
        ((boundary === 'publish' && path.endsWith('/publish') && init?.method === 'POST') ||
          (boundary === 'grant' &&
            path.endsWith('/collaborators/buyer-1') &&
            init?.method === 'PUT'))
      ) {
        raced = true;
        await applyVerifiedRefund(
          {
            bookingId: booking.booking_id,
            stripeSessionId: booking.stripe_session_id ?? '',
            chargeId: 'ch_refund',
            amountRefunded: 30000,
            full: true,
          },
          context,
        );
        expect(remote.buyerCanRead()).toBe(false);
      }
      return remote.fetchImpl(input, init);
    };
    await expect(
      fulfillConsultation(
        {
          ...identity,
          action: 'publish',
          sessionId: draft.sessionId,
        },
        { ...context, fetch: fetchImpl },
      ),
    ).rejects.toMatchObject({ reason: 'fulfillment-revoked' });
    expect(raced).toBe(true);
    expect(remote.buyerCanRead()).toBe(false);
    expect(remote.sites[0]?.status).toBe('draft');
  });
  it('observes a refund that completed while no material site yet existed', async () => {
    const remote = contentFixture();
    const context = deps(remote);
    let raced = false;
    const fetchImpl: typeof fetch = async (input, init) => {
      if (!raced && String(input).endsWith('/api/content/sites') && init?.method === 'POST') {
        raced = true;
        const result = await applyVerifiedRefund(
          {
            bookingId: booking.booking_id,
            stripeSessionId: booking.stripe_session_id ?? '',
            chargeId: 'ch_refund',
            amountRefunded: 30000,
            full: true,
          },
          context,
        );
        expect(result.status).toBe('no-material');
      }
      return remote.fetchImpl(input, init);
    };
    await expect(
      fulfillConsultation(prepare, { ...context, fetch: fetchImpl }),
    ).rejects.toMatchObject({
      reason: 'booking-refunded',
    });
    expect(remote.sites).toHaveLength(1);
    expect(remote.sessions).toHaveLength(0);
    expect(remote.buyerCanRead()).toBe(false);
  });
  it('preserves session notes while a partial refund races an older domain-pack publication', async () => {
    const remote = contentFixture();
    const context = deps(remote, { ...booking, stage_b: true, stage_b_fee: 'paid_addon' });
    const draft = await fulfillConsultation(
      {
        ...prepare,
        domainPack: {
          dns: 'DNS',
          path: 'Path',
          'proof-gap': 'Proof',
          stack: 'Stack',
          onboarding: 'Onboarding',
          walkthrough: 'Walkthrough',
        },
      },
      context,
    );
    let raced = false;
    const fetchImpl: typeof fetch = async (input, init) => {
      if (!raced && String(input).endsWith('/publish') && init?.method === 'POST') {
        raced = true;
        await applyVerifiedRefund(
          {
            bookingId: booking.booking_id,
            stripeSessionId: booking.stripe_session_id ?? '',
            chargeId: 'ch_refund',
            amountRefunded: 29700,
            full: false,
          },
          context,
        );
      }
      return remote.fetchImpl(input, init);
    };
    await expect(
      fulfillConsultation(
        { ...identity, action: 'publish', sessionId: draft.sessionId },
        {
          ...context,
          fetch: fetchImpl,
        },
      ),
    ).rejects.toMatchObject({ reason: 'publication-entitlement' });
    expect(remote.buyerCanRead()).toBe(true);
    expect(remote.buyerCanRead('dns')).toBe(false);
    expect(
      remote.pages.filter((page) => page.status === 'published').map((page) => page.slug),
    ).toEqual(['session-notes', 'recommended-next-step']);
  });
  it('refuses an empty persisted draft before any published material changes', async () => {
    const remote = contentFixture();
    const draft = await fulfillConsultation(prepare, deps(remote));
    const blocks = remote.sessions[0]?.docs[0]?.draft.blocks as { data: { content: string } }[];
    if (!blocks[0]) throw new Error('missing fixture material');
    blocks[0].data.content = '';
    await expect(
      fulfillConsultation(
        { ...identity, action: 'publish', sessionId: draft.sessionId },
        deps(remote),
      ),
    ).rejects.toMatchObject({ reason: 'material-unready' });
    expect(remote.revisions()).toBe(0);
    expect(remote.grants()).toBe(0);
  });
  it('rediscovers the unique persisted booking site when a racing create has already succeeded', async () => {
    const remote = contentFixture();
    let first = true;
    const fetchImpl: typeof fetch = async (input, init) => {
      if (first && String(input).endsWith('/api/content/sites') && init?.method === 'POST') {
        first = false;
        await remote.fetchImpl(input, init);
        return new Response(JSON.stringify({ success: false }), { status: 409 });
      }
      return remote.fetchImpl(input, init);
    };
    const result = await fulfillConsultation(prepare, { ...deps(remote), fetch: fetchImpl });
    expect(result.siteId).toBe('site-1');
    expect(remote.sites).toHaveLength(1);
  });
  it.each([
    'pending',
    'failed',
    'canceled',
  ])('does not treat a %s refund as completed provider evidence', async (status) => {
    const remote = contentFixture();
    expect(
      await refundedCheckoutFromStripe(
        'sk_test_fixture',
        'ch_refund',
        stripeFixture(remote, 30000, 30000, status),
      ),
    ).toBeNull();
    expect(remote.requests).toHaveLength(0);
  });
  it('records full refunds before revocation and retries failed access transitions without reactivation', async () => {
    const remote = contentFixture();
    const context = deps(remote);
    const draft = await fulfillConsultation(prepare, context);
    await fulfillConsultation(
      { ...identity, action: 'publish', sessionId: draft.sessionId },
      context,
    );
    const evidence = {
      ...identity,
      stripeSessionId: booking.stripe_session_id ?? '',
      chargeId: 'ch_refund',
      amountRefunded: 30000,
      full: true,
    };
    remote.failRevoke(true);
    await expect(applyVerifiedRefund(evidence, context)).rejects.toBeDefined();
    expect((await context.calendar.get(booking.booking_id))?.refund?.full).toBe(true);
    expect(remote.buyerCanRead()).toBe(false);
    await expect(fulfillConsultation(prepare, context)).rejects.toMatchObject({
      reason: 'booking-refunded',
    });
    remote.failRevoke(false);
    await applyVerifiedRefund(evidence, context);
    await applyVerifiedRefund(evidence, context);
    expect(remote.grants()).toBe(0);
    expect(remote.sites[0]?.status).toBe('draft');
    await expect(
      context.calendar.recordRefund(booking.booking_id, 'cs_other', evidence),
    ).rejects.toThrow('refund-binding');
  });
  it('pauses all previously published domain material after partial refunds while retaining session notes', async () => {
    const remote = contentFixture();
    const context = deps(remote, { ...booking, stage_b: true, stage_b_fee: 'paid_addon' });
    const domainPack = {
      dns: 'DNS',
      path: 'Path',
      'proof-gap': 'Proof',
      stack: 'Stack',
      onboarding: 'Onboarding',
      walkthrough: 'Walkthrough',
    };
    const draft = await fulfillConsultation({ ...prepare, domainPack }, context);
    await fulfillConsultation(
      { ...identity, action: 'publish', sessionId: draft.sessionId },
      context,
    );
    await applyVerifiedRefund(
      {
        bookingId: booking.booking_id,
        stripeSessionId: booking.stripe_session_id ?? '',
        chargeId: 'ch_refund',
        amountRefunded: 29700,
        full: false,
      },
      context,
    );
    expect(remote.grants()).toBe(1);
    expect(remote.sites[0]?.status).toBe('published');
    expect(
      remote.pages.filter((page) => page.status === 'published').map((page) => page.slug),
    ).toEqual(['session-notes', 'recommended-next-step']);
    expect((await context.calendar.get(booking.booking_id))?.refund?.domainPackReview).toBe(
      'review_required',
    );
    const notes = await fulfillConsultation(
      { ...prepare, notes: 'Notes remain available.' },
      context,
    );
    await fulfillConsultation(
      { ...identity, action: 'publish', sessionId: notes.sessionId },
      context,
    );
    expect(remote.pages.filter((page) => page.status === 'published')).toHaveLength(2);
    const resolve = {
      ...identity,
      action: 'resolve-domain-pack',
      chargeId: 'ch_refund',
      decision: 'retained',
    };
    const provider = stripeFixture(remote, 29700, 59700);
    await fulfillConsultation(resolve, {
      ...context,
      fetch: provider,
      config: { ...config, stripeSecretKey: 'sk_test_fixture' },
    });
    expect((await context.calendar.get(booking.booking_id))?.refund?.domainPackReview).toBe(
      'retained',
    );
    // A replay of the already-reviewed refund does not pause the retained scope again.
    await applyVerifiedRefund(
      {
        bookingId: booking.booking_id,
        stripeSessionId: booking.stripe_session_id ?? '',
        chargeId: 'ch_refund',
        amountRefunded: 29700,
        full: false,
      },
      context,
    );
    expect((await context.calendar.get(booking.booking_id))?.refund?.domainPackReview).toBe(
      'retained',
    );
    // A greater cumulative refund is new evidence and must be reviewed again.
    await applyVerifiedRefund(
      {
        bookingId: booking.booking_id,
        stripeSessionId: booking.stripe_session_id ?? '',
        chargeId: 'ch_refund',
        amountRefunded: 30000,
        full: false,
      },
      context,
    );
    expect((await context.calendar.get(booking.booking_id))?.refund?.domainPackReview).toBe(
      'review_required',
    );
  });
  it('revokes a newly completed full refund discovered during optional-scope review', async () => {
    const remote = contentFixture();
    const context = deps(remote, { ...booking, stage_b: true, stage_b_fee: 'paid_addon' });
    const draft = await fulfillConsultation(prepare, context);
    await fulfillConsultation(
      { ...identity, action: 'publish', sessionId: draft.sessionId },
      context,
    );
    await expect(
      fulfillConsultation(
        {
          ...identity,
          action: 'resolve-domain-pack',
          chargeId: 'ch_refund',
          decision: 'retained',
        },
        {
          ...context,
          fetch: stripeFixture(remote, 59700, 59700),
          config: { ...config, stripeSecretKey: 'sk_test_fixture' },
        },
      ),
    ).rejects.toMatchObject({ reason: 'booking-refunded' });
    expect((await context.calendar.get(booking.booking_id))?.refund?.full).toBe(true);
    expect(remote.buyerCanRead()).toBe(false);
    expect(remote.grants()).toBe(0);
  });
  it('checks prior published pages even when a new edit session contains only notes', async () => {
    const remote = contentFixture();
    const paid = { ...booking, stage_b: true, stage_b_fee: 'paid_addon' as const };
    const domainPack = {
      dns: 'DNS',
      path: 'Path',
      'proof-gap': 'Proof',
      stack: 'Stack',
      onboarding: 'Onboarding',
      walkthrough: 'Walkthrough',
    };
    const draft = await fulfillConsultation({ ...prepare, domainPack }, deps(remote, paid));
    await fulfillConsultation(
      { ...identity, action: 'publish', sessionId: draft.sessionId },
      deps(remote, paid),
    );
    const notes = await fulfillConsultation(prepare, deps(remote));
    await fulfillConsultation(
      { ...identity, action: 'publish', sessionId: notes.sessionId },
      deps(remote),
    );
    expect(remote.pages.filter((page) => page.status === 'published')).toHaveLength(2);
  });
  it('reconciles verified missing/cancelled provider state, but never infers cancellation from a provider failure', async () => {
    const remote = contentFixture();
    const draft = await fulfillConsultation(prepare, deps(remote));
    await fulfillConsultation(
      { ...identity, action: 'publish', sessionId: draft.sessionId },
      deps(remote),
    );
    const action = { ...identity, action: 'reconcile' };
    const unavailable = {
      ...deps(remote),
      calendar: {
        ...deps(remote).calendar,
        get: async () => {
          throw new Error('provider-unavailable');
        },
      },
    };
    await expect(fulfillConsultation(action, unavailable)).rejects.toThrow('provider-unavailable');
    expect(remote.grants()).toBe(1);
    await fulfillConsultation(action, deps(remote, null));
    expect(remote.grants()).toBe(0);
    expect(remote.sites[0]?.status).toBe('draft');
  });
  it('handles only signed refunds with current Stripe proof and retries incomplete delivery transitions', async () => {
    const remote = contentFixture();
    const context = deps(remote);
    const draft = await fulfillConsultation(prepare, context);
    await fulfillConsultation(
      { ...identity, action: 'publish', sessionId: draft.sessionId },
      context,
    );
    const now = new Date('2026-10-05T12:00:00.000Z');
    const raw = JSON.stringify({ type: 'charge.refunded', data: { object: { id: 'ch_refund' } } });
    const header = await stripeSignatureHeader(
      'whsec_fixture',
      raw,
      Math.floor(now.getTime() / 1000),
    );
    const request = (signature: string) =>
      new Request('https://revealuistudio.com/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': signature },
        body: raw,
      });
    const options = {
      calendar: context.calendar,
      now: () => now,
      fetchImpl: stripeFixture(remote, 30000),
      env: {
        stripeSecretKey: 'sk_test_fixture',
        stripeWebhookSecret: 'whsec_fixture',
        contentApiUrl: config.apiUrl,
        contentDeviceToken: config.deviceToken,
      },
    };
    expect((await handleConsultationRequest(request('invalid'), options)).status).toBe(400);
    remote.failRevoke(true);
    expect((await handleConsultationRequest(request(header), options)).status).toBe(503);
    expect((await context.calendar.get(booking.booking_id))?.refund?.full).toBe(true);
    remote.failRevoke(false);
    const response = await handleConsultationRequest(request(header), options);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'revoked' });
    expect(remote.grants()).toBe(0);
  });
  it('persists drafts, resumes after restart, publishes through revisions and grants only the buyer', async () => {
    const remote = contentFixture();
    const first = await fulfillConsultation(prepare, deps(remote));
    const resumed = await fulfillConsultation(
      { ...prepare, notes: 'Revised notes.' },
      deps(remote),
    );
    expect(first.status).toBe('draft');
    expect(first.delivered).toBe(false);
    expect(resumed.siteId).toBe(first.siteId);
    expect(resumed.sessionId).toBe(first.sessionId);
    expect(remote.sites).toHaveLength(1);
    expect(remote.pages).toHaveLength(2);
    expect(remote.sessions).toHaveLength(1);
    expect(remote.pages[0]?.status).toBe('draft');
    expect(remote.grants()).toBe(0);
    const published = await fulfillConsultation(
      { ...identity, action: 'publish', sessionId: first.sessionId },
      deps(remote),
    );
    expect(published).toMatchObject({
      status: 'published',
      delivered: true,
      url: 'https://admin.revealui.com/client-shares/site-1',
      customDomainAttached: false,
    });
    expect(remote.pages[0]?.blocks[0]?.data.content).toBe('Revised notes.');
    expect(remote.revisions()).toBe(2);
    expect(remote.grants()).toBe(1);
    await fulfillConsultation(
      { ...identity, action: 'publish', sessionId: first.sessionId },
      deps(remote),
    );
    expect(remote.revisions()).toBe(2);
    expect(
      remote.requests.every(
        (request) =>
          request.redirect === 'error' && request.authorization === `Bearer ${config.deviceToken}`,
      ),
    ).toBe(true);
  });

  it.each([
    null,
    { ...booking, status: 'slot_held' as const },
    { ...booking, stripe_session_id: null },
    { ...booking, event_id: null },
  ])('denies missing or unproven paid bookings before touching client storage', async (record) => {
    const remote = contentFixture();
    await expect(fulfillConsultation(prepare, deps(remote, record))).rejects.toMatchObject({
      reason: record ? 'booking-unpaid' : 'booking-missing',
    });
    expect(remote.requests).toHaveLength(0);
  });
  it.each([
    { email: 'other@example.com' },
    { emailVerified: false },
    { status: 'suspended' },
    { id: 'other-user' },
    { type: 'agent' },
  ])('requires the booking email and an active verified canonical buyer', async (patch) => {
    const remote = contentFixture();
    remote.buyer(patch);
    await expect(fulfillConsultation(prepare, deps(remote))).rejects.toBeDefined();
    expect(remote.sites).toHaveLength(0);
  });
  it('rejects client purchase flags and refuses domain-pack pages without server entitlement', async () => {
    const remote = contentFixture();
    await expect(
      fulfillConsultation({ ...prepare, paid: true }, deps(remote)),
    ).rejects.toMatchObject({ reason: 'fulfillment-body' });
    const domainPack = {
      dns: 'DNS notes',
      path: 'Path',
      'proof-gap': 'Proof',
      stack: 'Stack',
      onboarding: 'Onboarding',
      walkthrough: 'Walkthrough',
    };
    await expect(
      fulfillConsultation({ ...prepare, domainPack }, deps(remote)),
    ).rejects.toMatchObject({ reason: 'domain-pack-not-purchased' });
    const paid = { ...booking, stage_b: true, stage_b_fee: 'paid_addon' as const };
    const draft = await fulfillConsultation({ ...prepare, domainPack }, deps(remote, paid));
    expect(remote.pages).toHaveLength(8);
    await expect(
      fulfillConsultation(
        { ...identity, action: 'publish', sessionId: draft.sessionId },
        deps(remote),
      ),
    ).rejects.toMatchObject({ reason: 'publication-entitlement' });
    await expect(
      fulfillConsultation(
        { ...identity, action: 'publish', sessionId: draft.sessionId },
        deps(remote, paid),
      ),
    ).rejects.toMatchObject({ reason: 'publication-entitlement' });
    const entitledRemote = contentFixture();
    const entitledContext = deps(entitledRemote, paid);
    const entitledDraft = await fulfillConsultation({ ...prepare, domainPack }, entitledContext);
    const published = await fulfillConsultation(
      { ...identity, action: 'publish', sessionId: entitledDraft.sessionId },
      entitledContext,
    );
    expect(published.customDomainAttached).toBe(false);
  });
  it('rejects mismatched tenant binding and a session belonging to another site', async () => {
    const remote = contentFixture();
    const draft = await fulfillConsultation(prepare, deps(remote));
    await expect(
      fulfillConsultation(
        { ...identity, buyerUserId: 'other-user', action: 'revoke' },
        deps(remote),
      ),
    ).rejects.toMatchObject({ reason: 'fulfillment-binding' });
    if (remote.sessions[0]) remote.sessions[0].siteId = 'foreign-site';
    await expect(
      fulfillConsultation(
        { ...identity, action: 'publish', sessionId: draft.sessionId },
        deps(remote),
      ),
    ).rejects.toMatchObject({ reason: 'session-binding' });
    expect(remote.grants()).toBe(0);
  });
  it('refuses publication with missing material or foreign documents', async () => {
    const remote = contentFixture();
    const draft = await fulfillConsultation(prepare, deps(remote));
    const session = remote.sessions[0];
    if (!session) throw new Error('missing fixture session');
    const original = session.docs;
    session.docs = [];
    await expect(
      fulfillConsultation(
        { ...identity, action: 'publish', sessionId: draft.sessionId },
        deps(remote),
      ),
    ).rejects.toMatchObject({ reason: 'material-missing' });
    session.docs = [...original, { docType: 'page', docId: 'foreign-page', draft: {} }];
    await expect(
      fulfillConsultation(
        { ...identity, action: 'publish', sessionId: draft.sessionId },
        deps(remote),
      ),
    ).rejects.toMatchObject({ reason: 'publication-scope' });
    expect(remote.revisions()).toBe(0);
  });
  it('does not grant access when the revision publication conflicts', async () => {
    const remote = contentFixture();
    const draft = await fulfillConsultation(prepare, deps(remote));
    remote.failPublish();
    await expect(
      fulfillConsultation(
        { ...identity, action: 'publish', sessionId: draft.sessionId },
        deps(remote),
      ),
    ).rejects.toMatchObject({ reason: 'content-conflict' });
    expect(remote.grants()).toBe(0);
    expect(remote.sites[0]?.status).toBe('draft');
  });
  it('revokes access durably even when a cancelled booking no longer exists', async () => {
    const remote = contentFixture();
    const draft = await fulfillConsultation(prepare, deps(remote));
    await fulfillConsultation(
      { ...identity, action: 'publish', sessionId: draft.sessionId },
      deps(remote),
    );
    const revoked = await fulfillConsultation(
      { ...identity, action: 'revoke' },
      deps(remote, null),
    );
    expect(revoked.status).toBe('revoked');
    expect(remote.grants()).toBe(0);
    expect(remote.sites[0]?.status).toBe('draft');
    await fulfillConsultation({ ...identity, action: 'revoke' }, deps(remote, null));
    await expect(
      fulfillConsultation(
        { ...identity, action: 'publish', sessionId: draft.sessionId },
        deps(remote, null),
      ),
    ).rejects.toMatchObject({ reason: 'booking-missing' });
  });
  it('fails closed on unsupported content credentials', async () => {
    const remote = contentFixture();
    await expect(
      fulfillConsultation(prepare, {
        ...deps(remote),
        config: { ...config, deviceToken: 'api-key' },
      }),
    ).rejects.toMatchObject({ reason: 'content-not-configured' });
    await expect(
      fulfillConsultation(prepare, {
        ...deps(remote),
        config: { ...config, apiUrl: 'https://api.revealui.com/other' },
      }),
    ).rejects.toMatchObject({ reason: 'content-not-configured' });
    expect(remote.requests).toHaveLength(0);
  });
  it('enforces owner and exact request host, and never reports a failed access grant as delivered', async () => {
    const remote = contentFixture();
    const draft = await fulfillConsultation(prepare, deps(remote));
    remote.failGrant();
    const request = (host: string, token?: string) =>
      new Request(`https://${host}/api/share`, {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: JSON.stringify({ ...identity, action: 'publish', sessionId: draft.sessionId }),
      });
    const options = { env: { ownerSession: 'operator-test' }, fulfillment: deps(remote) };
    expect((await handleShareRequest(request('revealuistudio.com'), options)).status).toBe(403);
    expect(
      (await handleShareRequest(request('acme.revealuistudio.com', 'operator-test'), options))
        .status,
    ).toBe(403);
    const failed = await handleShareRequest(
      request('revealuistudio.com', 'operator-test'),
      options,
    );
    expect(failed.status).toBe(502);
    expect(await failed.json()).toMatchObject({ delivered: false });
    expect(failed.headers.get('cache-control')).toBe('private, no-store');
    expect(remote.grants()).toBe(0);
  });
});
