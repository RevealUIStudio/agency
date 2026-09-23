import { randomUUID } from 'node:crypto';
import {
  type CheckoutDraft,
  CONSULTATION_HOLD_TTL_MS,
  CONSULTATION_HORIZON_MS,
  CONSULTATION_MAX_RANGE_MS,
  CONSULTATION_SLOT_MINUTES,
  CONSULTATION_TIME_ZONE,
  cleanBuyerEmail,
  cleanBuyerName,
  cleanCompany,
  enumerateConsultationSlots,
  hourStarts,
  isOfferedConsultationSlot,
  type TimeInterval,
} from '../app/lib/consultation-book';
import {
  CONSULTATION_HOUR_MAX,
  CONSULTATION_HOUR_MIN,
  DEFAULT_CONSULTATION_HOURS,
} from '../app/lib/consultation-hours';
import type { CalendarGateway } from './consultation-calendar';
import { GoogleCalendar, MemoryCalendar } from './consultation-calendar';
import { type DeskConsultationUpdate, recordDeskConsultationScheduled } from './consultation-desk';
import { buildConsultationConfirmEmail, type ConsultationConfirmEmail } from './consultation-email';
import {
  type BookingStore,
  type ConsultationBooking,
  createBookingStore,
} from './consultation-store';
import {
  FixtureStripe,
  StripeCheckout,
  type StripeGateway,
  verifyStripeSignature,
} from './consultation-stripe';

const BLOCKED_BOOK_KEYS = [
  'waive',
  'stageBWaive',
  'stage_b_waive',
  'feeWaiver',
  'fee_waiver',
] as const;

export interface ConsultationDeps {
  readonly now: () => Date;
  readonly store: BookingStore;
  readonly calendar: CalendarGateway | null;
  readonly stripe: StripeGateway | null;
  readonly webhookSecret: string | null;
  readonly desk: {
    record(update: DeskConsultationUpdate): Promise<unknown>;
  };
  readonly onConfirmEmail: (email: ConsultationConfirmEmail) => void;
  readonly siteUrl?: string;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
    },
  });
}

function parseHours(value: unknown, fallback: number | null): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value < CONSULTATION_HOUR_MIN || value > CONSULTATION_HOUR_MAX) return null;
  return value;
}

function siteOrigin(request: Request, siteUrl?: string): string {
  if (siteUrl) return siteUrl.replace(/\/$/, '');
  const url = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host;
  const proto = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  return `${proto}://${host}`;
}

async function availabilityWindow(
  request: Request,
  deps: ConsultationDeps,
): Promise<{ from: Date; to: Date } | Response> {
  const url = new URL(request.url);
  const now = deps.now();
  const fromRaw = url.searchParams.get('from');
  const toRaw = url.searchParams.get('to');
  const from = fromRaw ? new Date(fromRaw) : now;
  const to = toRaw ? new Date(toRaw) : new Date(now.getTime() + CONSULTATION_HORIZON_MS);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    return json(400, { error: 'invalid' });
  }
  if (to.getTime() - from.getTime() > CONSULTATION_MAX_RANGE_MS) {
    return json(400, { error: 'invalid' });
  }
  return { from, to };
}

async function blockedIntervals(
  deps: ConsultationDeps,
  from: Date,
  to: Date,
): Promise<{ busy: TimeInterval[]; holds: TimeInterval[] }> {
  if (!deps.calendar) throw new Error('calendar');
  const now = deps.now();
  await deps.calendar.purgeExpired(now);
  const [busy, calendarHolds, storeHolds] = await Promise.all([
    deps.calendar.busy(from, to),
    deps.calendar.activeHolds(now),
    deps.store.activeHolds(now.getTime()),
  ]);
  return {
    busy,
    holds: [
      ...calendarHolds,
      ...storeHolds.map((booking) => ({ start: booking.start, end: booking.end })),
    ],
  };
}

export async function handleAvailability(
  request: Request,
  deps: ConsultationDeps = productionDeps(),
): Promise<Response> {
  if (request.method !== 'GET') return json(405, { error: 'method' });
  const hours = parseHours(requestUrlHours(request), DEFAULT_CONSULTATION_HOURS);
  if (hours === null) return json(400, { error: 'invalid' });
  const window = await availabilityWindow(request, deps);
  if (window instanceof Response) return window;
  if (!deps.calendar) return json(503, { error: 'calendar-unconfigured' });
  try {
    const { busy, holds } = await blockedIntervals(deps, window.from, window.to);
    const slots = enumerateConsultationSlots({
      from: window.from,
      to: window.to,
      now: deps.now(),
      hours,
      busy,
      holds,
    });
    return json(200, {
      timezone: CONSULTATION_TIME_ZONE,
      slotMinutes: CONSULTATION_SLOT_MINUTES,
      hours,
      slots,
    });
  } catch {
    return json(503, { error: 'calendar-unconfigured' });
  }
}

function requestUrlHours(request: Request): unknown {
  const raw = new URL(request.url).searchParams.get('hours');
  if (raw === null) return undefined;
  if (!/^\d+$/.test(raw)) return raw;
  return Number(raw);
}

interface BookBody {
  readonly start?: unknown;
  readonly end?: unknown;
  readonly hours?: unknown;
  readonly name?: unknown;
  readonly email?: unknown;
  readonly company?: unknown;
  readonly stage_b?: unknown;
}

function blockedBookKey(body: Record<string, unknown>): boolean {
  return BLOCKED_BOOK_KEYS.some((key) => key in body);
}

export async function handleBook(
  request: Request,
  deps: ConsultationDeps = productionDeps(),
): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'method' });
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return json(400, { error: 'invalid' });
  }
  if (!parsed || typeof parsed !== 'object') return json(400, { error: 'invalid' });
  const body = parsed as BookBody & Record<string, unknown>;
  if (blockedBookKey(body)) return json(400, { error: 'invalid' });
  const hours = parseHours(body.hours, DEFAULT_CONSULTATION_HOURS);
  const name = typeof body.name === 'string' ? cleanBuyerName(body.name) : null;
  const email = typeof body.email === 'string' ? cleanBuyerEmail(body.email) : null;
  const company =
    typeof body.company === 'string'
      ? cleanCompany(body.company)
      : body.company === undefined
        ? ''
        : null;
  const stageB = body.stage_b === undefined ? false : body.stage_b === true;
  if (
    hours === null ||
    !name ||
    !email ||
    company === null ||
    typeof body.start !== 'string' ||
    typeof body.end !== 'string' ||
    (body.stage_b !== undefined && body.stage_b !== true && body.stage_b !== false)
  ) {
    return json(400, { error: 'invalid' });
  }
  if (!deps.calendar) return json(503, { error: 'calendar-unconfigured' });
  if (!deps.stripe) return json(503, { error: 'checkout-unconfigured' });

  const startMs = Date.parse(body.start);
  const endMs = Date.parse(body.end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return json(400, { error: 'invalid' });

  const now = deps.now();
  let busy: TimeInterval[] = [];
  let holds: TimeInterval[] = [];
  try {
    const blocked = await blockedIntervals(
      deps,
      new Date(startMs - 3_600_000),
      new Date(endMs + 3_600_000),
    );
    busy = blocked.busy;
    holds = blocked.holds;
  } catch {
    return json(503, { error: 'calendar-unconfigured' });
  }
  if (
    !isOfferedConsultationSlot({
      start: body.start,
      end: body.end,
      hours,
      now,
      busy,
      holds,
    })
  ) {
    return json(409, { error: 'slot-taken' });
  }

  const booking: ConsultationBooking = {
    id: randomUUID(),
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    hours,
    name,
    email,
    company,
    stageB,
    status: 'slot_held',
    expiresAt: new Date(now.getTime() + CONSULTATION_HOLD_TTL_MS).toISOString(),
    checkoutSessionId: null,
    eventId: null,
    meetLink: null,
    createdAt: now.toISOString(),
    paidAt: null,
  };
  const starts = hourStarts(booking.start, booking.hours);
  const claimed = await deps.store.claimHours(
    starts,
    booking.id,
    Date.parse(booking.expiresAt),
    now.getTime(),
  );
  if (!claimed) return json(409, { error: 'slot-taken' });
  await deps.store.save(booking);

  let eventId: string | null = null;
  try {
    eventId = await deps.calendar.insertHold(booking);
    const held = { ...booking, eventId };
    await deps.store.save(held);
    const origin = siteOrigin(request, deps.siteUrl);
    const draft: CheckoutDraft = {
      bookingId: held.id,
      start: held.start,
      end: held.end,
      hours: held.hours,
      stageB: held.stageB,
      buyerEmail: held.email,
      buyerName: held.name,
      company: held.company,
    };
    const session = await deps.stripe.createCheckout({
      draft,
      successUrl: `${origin}/consultation/book/success?booking=${encodeURIComponent(held.id)}`,
      cancelUrl: `${origin}/consultation/book/cancel?booking=${encodeURIComponent(held.id)}`,
      expiresAtSec: Math.floor(Date.parse(held.expiresAt) / 1000),
    });
    await deps.store.save({ ...held, checkoutSessionId: session.id });
    return json(200, { checkout_url: session.url, booking_id: held.id });
  } catch {
    await deps.store.releaseHours(starts, booking.id);
    await deps.store.save({ ...booking, eventId, status: 'cancelled' });
    if (eventId) {
      try {
        await deps.calendar.deleteEvent(eventId);
      } catch {
        // The hold TTL still drops the slot if delete fails.
      }
    }
    return json(502, { error: 'checkout-failed' });
  }
}

interface StripeEvent {
  readonly type?: unknown;
  readonly data?: { readonly object?: unknown };
}

function stringMeta(source: unknown): Record<string, string> {
  if (!source || typeof source !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

function bookingFromMetadata(
  meta: Record<string, string>,
  checkoutSessionId: string | null,
): ConsultationBooking | null {
  const hours = Number(meta.hours);
  const email = meta.buyer_email ? cleanBuyerEmail(meta.buyer_email) : null;
  const name = meta.buyer_name ? cleanBuyerName(meta.buyer_name) : null;
  if (!meta.booking_id || !meta.start || !meta.end || !email || !name) return null;
  if (!Number.isInteger(hours) || hours < CONSULTATION_HOUR_MIN || hours > CONSULTATION_HOUR_MAX) {
    return null;
  }
  if (Date.parse(meta.end) !== Date.parse(meta.start) + hours * 3_600_000) return null;
  return {
    id: meta.booking_id,
    start: new Date(Date.parse(meta.start)).toISOString(),
    end: new Date(Date.parse(meta.end)).toISOString(),
    hours,
    name,
    email,
    company: meta.company ?? '',
    stageB: meta.stage_b === 'true',
    status: 'slot_held',
    expiresAt: new Date(0).toISOString(),
    checkoutSessionId,
    eventId: null,
    meetLink: null,
    createdAt: new Date(0).toISOString(),
    paidAt: null,
  };
}

async function schedulePaidBooking(
  deps: ConsultationDeps,
  booking: ConsultationBooking,
  checkoutSessionId: string | null,
): Promise<Response> {
  const existing = await deps.store.get(booking.id);
  if (existing?.status === 'paid_scheduled' && existing.meetLink) {
    return json(200, { received: true, status: 'duplicate' });
  }
  if (!deps.calendar) return json(503, { error: 'calendar-unconfigured' });
  const locked = await deps.store.acquireScheduleLock(booking.id);
  if (!locked) {
    const again = await deps.store.get(booking.id);
    if (again?.status === 'paid_scheduled' && again.meetLink) {
      return json(200, { received: true, status: 'duplicate' });
    }
    return json(500, { error: 'retry' });
  }
  try {
    const current = (await deps.store.get(booking.id)) ?? booking;
    if (current.status === 'paid_scheduled' && current.meetLink) {
      return json(200, { received: true, status: 'duplicate' });
    }
    const confirmed = await deps.calendar.confirmPaid({
      ...booking,
      ...current,
      eventId: current.eventId ?? booking.eventId,
    });
    const patch = {
      eventId: confirmed.eventId,
      meetLink: confirmed.meetLink,
      paidAt: deps.now().toISOString(),
      checkoutSessionId: checkoutSessionId ?? current.checkoutSessionId,
    };
    const committed = await deps.store.commitPaid(current, patch);
    if (committed === 'duplicate') {
      const row = await deps.store.get(booking.id);
      if (row && !row.meetLink)
        await deps.store.save({ ...row, ...patch, status: 'paid_scheduled' });
    }
    if (committed === 'updated') {
      const paid = await deps.store.get(booking.id);
      const subject = paid ?? {
        ...booking,
        meetLink: confirmed.meetLink,
        eventId: confirmed.eventId,
      };
      try {
        await deps.desk.record({
          bookingId: subject.id,
          email: subject.email,
          meetLink: confirmed.meetLink,
          eventId: confirmed.eventId,
          fromStatus: 'consultation_paid',
          toStatus: 'consultation_scheduled',
        });
      } catch {
        // Desk is optional. The Calendar event is the schedule of record.
      }
      deps.onConfirmEmail(buildConsultationConfirmEmail(subject, confirmed.meetLink));
    }
    return json(200, {
      received: true,
      status: committed === 'updated' ? 'paid_scheduled' : 'duplicate',
    });
  } catch {
    return json(500, { error: 'calendar' });
  } finally {
    await deps.store.releaseScheduleLock(booking.id);
  }
}

export async function handleStripeWebhook(
  request: Request,
  deps: ConsultationDeps = productionDeps(),
): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'method' });
  if (!deps.webhookSecret) return json(500, { error: 'webhook-unconfigured' });
  const payload = await request.text();
  const header = request.headers.get('stripe-signature') ?? '';
  if (
    !verifyStripeSignature(
      payload,
      header,
      deps.webhookSecret,
      Math.floor(deps.now().getTime() / 1000),
    )
  ) {
    return json(400, { error: 'signature' });
  }
  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return json(400, { error: 'invalid' });
  }
  const object = event.data?.object;
  if (!object || typeof object !== 'object') return json(200, { received: true, ignored: 'empty' });
  const record = object as Record<string, unknown>;
  const meta = stringMeta(record.metadata);

  if (event.type === 'checkout.session.completed') {
    if (record.payment_status !== 'paid') return json(200, { received: true, ignored: 'unpaid' });
    if (
      typeof record.client_reference_id === 'string' &&
      record.client_reference_id !== meta.booking_id
    ) {
      return json(200, { received: true, ignored: 'reference' });
    }
    const booking = bookingFromMetadata(meta, typeof record.id === 'string' ? record.id : null);
    if (!booking) return json(200, { received: true, ignored: 'no-booking' });
    if (meta.booking_id !== booking.id) return json(200, { received: true, ignored: 'no-booking' });
    // Metadata is the Checkout contract. Prefer the stored row when present.
    const stored = await deps.store.get(booking.id);
    return schedulePaidBooking(
      deps,
      stored ?? booking,
      typeof record.id === 'string' ? record.id : null,
    );
  }

  if (event.type === 'invoice.paid') {
    const booking = bookingFromMetadata(meta, null);
    if (!booking) return json(200, { received: true, ignored: 'no-booking' });
    const stored = await deps.store.get(booking.id);
    return schedulePaidBooking(deps, stored ?? booking, stored?.checkoutSessionId ?? null);
  }

  return json(200, {
    received: true,
    ignored: typeof event.type === 'string' ? event.type : 'unknown',
  });
}

function readGoogleCreds(env: NodeJS.ProcessEnv): { email: string; key: string } | null {
  const raw = env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    try {
      const decoded = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded) as { client_email?: string; private_key?: string };
      if (parsed.client_email && parsed.private_key) {
        return { email: parsed.client_email, key: parsed.private_key.replace(/\\n/g, '\n') };
      }
    } catch {
      return null;
    }
  }
  const email = env.GOOGLE_CLIENT_EMAIL?.trim();
  const key = env.GOOGLE_PRIVATE_KEY?.trim();
  if (email && key) return { email, key: key.replace(/\\n/g, '\n') };
  return null;
}

function logSkippedConfirm(email: ConsultationConfirmEmail): void {
  console.info(
    JSON.stringify({
      type: 'consultation.confirm-email',
      send: email.send,
      bookingId: email.bookingId,
      todo: 'resend-not-configured',
    }),
  );
}

let singleton: ConsultationDeps | undefined;
let fixtureCalendar: MemoryCalendar | undefined;

export function productionDeps(env: NodeJS.ProcessEnv = process.env): ConsultationDeps {
  if (singleton) return singleton;
  const upstashUrl = env.UPSTASH_REDIS_REST_URL?.trim() || env.KV_REST_API_URL?.trim();
  const upstashToken = env.UPSTASH_REDIS_REST_TOKEN?.trim() || env.KV_REST_API_TOKEN?.trim();
  const store = createBookingStore({ url: upstashUrl, token: upstashToken });
  const fixture = env.CONSULTATION_CALENDAR_FIXTURE === '1' && !env.VERCEL;
  if (fixture) {
    fixtureCalendar = new MemoryCalendar();
    singleton = {
      now: () => new Date(),
      store,
      calendar: fixtureCalendar,
      stripe: new FixtureStripe(),
      webhookSecret: env.STRIPE_WEBHOOK_SECRET?.trim() || 'fixture-webhook-secret',
      desk: { record: recordDeskConsultationScheduled },
      onConfirmEmail: logSkippedConfirm,
      siteUrl: env.PUBLIC_SITE_URL?.trim() || undefined,
    };
    return singleton;
  }
  const creds = readGoogleCreds(env);
  const calendarId = env.GOOGLE_CALENDAR_ID?.trim();
  const calendar =
    creds && calendarId
      ? new GoogleCalendar({
          calendarId,
          clientEmail: creds.email,
          privateKey: creds.key,
          impersonate: env.GOOGLE_CALENDAR_IMPERSONATE?.trim() || undefined,
        })
      : null;
  const stripeKey = env.STRIPE_SECRET_KEY?.trim();
  singleton = {
    now: () => new Date(),
    store,
    calendar,
    stripe: stripeKey ? new StripeCheckout(stripeKey) : null,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET?.trim() || null,
    desk: { record: recordDeskConsultationScheduled },
    onConfirmEmail: logSkippedConfirm,
    siteUrl: env.PUBLIC_SITE_URL?.trim() || undefined,
  };
  return singleton;
}

export function resetProductionDepsForTests(): void {
  singleton = undefined;
  fixtureCalendar = undefined;
}
