/**
 * Consultation availability, slot hold, and Stripe webhook.
 * Book and the paid webhook call the action registry. The calendar event
 * is the schedule record. Buyer confirmation stays a draft.
 * A new paid Google Meet write notifies founder@revealui.com.
 */

import {
  type ActionError,
  runConsultationBook,
  runPaidConsultation,
} from '../app/lib/consultation-actions';
import {
  type Booking,
  bookInputFromNetwork,
  type ConfirmationEmail,
  parseBookBody,
} from '../app/lib/consultation-booking';
import { consultationDueCents } from '../app/lib/consultation-hours';
import {
  mintNetworkToken,
  NetworkWaiveUnconfigured,
  networkBookPath,
  networkEmailHint,
  networkEmailMatches,
  parseNetworkLinkBody,
  verifyNetworkToken,
} from '../app/lib/consultation-network-waive';
import type { OwnerPaidNotice } from '../app/lib/consultation-owner';
import {
  CONSULTATION_TZ,
  generateConsultationSlots,
  zonedWallToUtc,
} from '../app/lib/consultation-slots';
import {
  type CalendarPort,
  type ConsultationEnv,
  calendarFromEnv,
  consultationEnvFromProcess,
} from './consultation-calendar';
import { deliverOwnerPaidNotice } from './consultation-owner-mail';
import { type StripePort, stripeFromEnv, verifyStripeSignature } from './consultation-stripe';
import { verifySession } from './session';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ConsultationDeps {
  readonly now?: () => Date;
  readonly env?: ConsultationEnv;
  readonly calendar?: CalendarPort;
  readonly stripe?: StripePort;
  readonly fetchImpl?: typeof fetch;
  readonly bookingId?: () => string;
  readonly onConfirmation?: (email: ConfirmationEmail) => void;
  /** Overrides the production Gmail notice. Tests pass a fake sink. */
  readonly onOwnerPaid?: (notice: OwnerPaidNotice) => void | Promise<void>;
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

function ymd(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const yearText = match[1];
  const monthText = match[2];
  const dayText = match[3];
  if (!yearText || !monthText || !dayText) return null;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function parseBound(value: string, edge: 'from' | 'to'): Date | null {
  const date = ymd(value);
  if (date) {
    if (edge === 'from') return zonedWallToUtc(date.year, date.month, date.day, 0, 0);
    const next = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));
    return zonedWallToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed);
}

function siteOrigin(request: Request, env: ConsultationEnv): string {
  const configured = env.publicSiteUrl?.replace(/\/+$/u, '');
  if (configured) return configured;
  return new URL(request.url).origin;
}

function bookHttp(error: ActionError): { status: number; error: string } {
  if (error === 'slot-taken') return { status: 409, error: 'slot-taken' };
  if (error === 'network-coupon-unconfigured') {
    return { status: 503, error: 'network-coupon-unconfigured' };
  }
  if (error === 'calendar') return { status: 502, error: 'calendar' };
  return { status: 502, error: 'checkout' };
}

async function availability(
  request: Request,
  calendar: CalendarPort,
  now: Date,
): Promise<Response> {
  const url = new URL(request.url);
  const hoursRaw = url.searchParams.get('hours');
  const hours = hoursRaw === null || hoursRaw.trim() === '' ? 1 : Number(hoursRaw);
  try {
    consultationDueCents(hours);
  } catch {
    return json(400, { error: 'hours' });
  }
  const fromRaw = url.searchParams.get('from');
  const toRaw = url.searchParams.get('to');
  let from = now;
  let to = new Date(now.getTime() + 21 * DAY_MS);
  if (fromRaw && fromRaw.trim() !== '') {
    const parsed = parseBound(fromRaw.trim(), 'from');
    if (!parsed) return json(400, { error: 'from' });
    from = parsed;
  }
  if (toRaw && toRaw.trim() !== '') {
    const parsed = parseBound(toRaw.trim(), 'to');
    if (!parsed) return json(400, { error: 'to' });
    to = parsed;
  }
  try {
    await calendar.expireHolds(now);
    const busy = await calendar.busy(from, to, now);
    const slots = generateConsultationSlots({ from, to, now, hours, busy });
    return json(200, { timezone: CONSULTATION_TZ, hours, slots });
  } catch {
    return json(502, { error: 'calendar' });
  }
}

async function book(
  request: Request,
  env: ConsultationEnv,
  calendar: CalendarPort,
  stripe: StripePort,
  now: Date,
  bookingId: string,
): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    raw = null;
  }
  const parsed = parseBookBody(raw);
  if (!parsed) return json(400, { error: 'invalid-body' });

  let claims = null;
  if (parsed.networkToken) {
    if (!env.networkWaiveSecret) return json(503, { error: 'network-waive-unconfigured' });
    claims = await verifyNetworkToken({
      secret: env.networkWaiveSecret,
      token: parsed.networkToken,
      now,
    });
    if (!claims) return json(400, { error: 'network-token' });
    if (!networkEmailMatches(claims, parsed.email)) return json(400, { error: 'network-email' });
  }
  const input = bookInputFromNetwork(parsed, claims);
  const origin = siteOrigin(request, env);
  const booked = await runConsultationBook(input, bookingId, {
    now,
    calendar,
    stripe,
    origin,
    consultationPriceId: env.consultationPriceId,
    stageBPriceId: env.stageBPriceId,
    stageBNetworkCouponId: env.stageBNetworkCouponId,
  });
  if (!booked.ok) {
    const mapped = bookHttp(booked.error);
    return json(mapped.status, { error: mapped.error });
  }
  return json(200, { booking_id: bookingId, checkout_url: booked.value.checkoutUrl });
}

async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.trim() === '') return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function networkStatus(request: Request, env: ConsultationEnv, now: Date): Promise<Response> {
  const token = new URL(request.url).searchParams.get('nw')?.trim() ?? '';
  if (!token || !env.networkWaiveSecret) return json(200, { ok: false });
  const claims = await verifyNetworkToken({ secret: env.networkWaiveSecret, token, now });
  if (!claims) return json(200, { ok: false });
  return json(200, {
    ok: true,
    expires_at: new Date(claims.exp * 1000).toISOString(),
    ...(claims.email ? { email_hint: networkEmailHint(claims.email) } : {}),
  });
}

async function networkLink(request: Request, env: ConsultationEnv, now: Date): Promise<Response> {
  const session = verifySession(request, { ownerSession: env.ownerSession });
  if (session.role !== 'owner') return json(403, { error: 'owner-session' });
  if (!env.networkWaiveSecret) return json(503, { error: 'network-waive-unconfigured' });

  const raw = await readJsonBody(request);
  if (raw === null) return json(400, { error: 'invalid-body' });
  const link = parseNetworkLinkBody(raw);
  if (!link) return json(400, { error: 'invalid-body' });

  try {
    const minted = await mintNetworkToken({
      secret: env.networkWaiveSecret,
      now,
      ttlSeconds: link.ttlSeconds,
      email: link.email,
    });
    const origin = siteOrigin(request, env);
    return json(200, {
      url: `${origin}${networkBookPath(minted.token, link.hours)}`,
      expires_at: new Date(minted.claims.exp * 1000).toISOString(),
    });
  } catch (error) {
    if (error instanceof NetworkWaiveUnconfigured) {
      return json(503, { error: 'network-waive-unconfigured' });
    }
    return json(500, { error: 'network-link' });
  }
}

function amountTotalOf(session: object): number | null {
  const record = session as { amount_total?: unknown };
  const amount = record.amount_total;
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 0) return null;
  return amount;
}

async function bookingView(request: Request, calendar: CalendarPort): Promise<Response> {
  const id = new URL(request.url).searchParams.get('booking')?.trim() ?? '';
  if (!id || id.length > 80 || id.includes('/')) return json(200, { ok: false, reason: 'missing' });
  let booking: Booking | null;
  try {
    booking = await calendar.get(id);
  } catch {
    return json(502, { error: 'calendar' });
  }
  if (!booking) return json(200, { ok: false, reason: 'missing' });
  if (booking.status !== 'paid_scheduled') return json(200, { ok: false, reason: 'pending' });
  return json(200, {
    ok: true,
    start: booking.start,
    end: booking.end,
    meet_link: booking.meet_link,
    stage_b: booking.stage_b,
  });
}

async function webhook(
  request: Request,
  env: ConsultationEnv,
  calendar: CalendarPort,
  now: Date,
  fetchImpl: typeof fetch,
  sink: ConsultationDeps['onConfirmation'],
  ownerSink: ConsultationDeps['onOwnerPaid'],
): Promise<Response> {
  if (!env.stripeWebhookSecret) return json(500, { error: 'webhook-unconfigured' });
  const rawBody = await request.text();
  const header = request.headers.get('stripe-signature') ?? '';
  const valid = await verifyStripeSignature(
    env.stripeWebhookSecret,
    rawBody,
    header,
    now.getTime(),
  );
  if (!valid) return json(400, { error: 'signature' });

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(400, { error: 'payload' });
  }
  const event = payload && typeof payload === 'object' ? payload : null;
  const type = event && 'type' in event ? event.type : '';
  if (type !== 'checkout.session.completed') {
    return json(200, { received: true, status: 'ignored' });
  }
  const data =
    event && 'data' in event && event.data && typeof event.data === 'object' ? event.data : null;
  const session =
    data && 'object' in data && data.object && typeof data.object === 'object' ? data.object : null;
  if (!session) return json(200, { received: true, status: 'ignored' });
  const paymentStatus = 'payment_status' in session ? session.payment_status : '';
  if (paymentStatus !== 'paid') return json(200, { received: true, status: 'ignored' });

  const metadata =
    'metadata' in session && session.metadata && typeof session.metadata === 'object'
      ? session.metadata
      : null;
  const bookingId =
    metadata && 'booking_id' in metadata && typeof metadata.booking_id === 'string'
      ? metadata.booking_id
      : '';
  if (!bookingId || !metadata) return json(200, { received: true, status: 'ignored' });

  const sessionId = 'id' in session && typeof session.id === 'string' ? session.id : '';
  let booking: Awaited<ReturnType<CalendarPort['get']>>;
  try {
    booking = await calendar.get(bookingId);
  } catch {
    return json(500, { error: 'calendar' });
  }

  const paid = await runPaidConsultation(
    {
      paymentStatus: 'paid',
      sessionId,
      metadata: metadata as Record<string, unknown>,
      booking,
      amountTotal: amountTotalOf(session),
    },
    {
      now,
      calendar,
      origin: siteOrigin(request, env),
      consultationPriceId: env.consultationPriceId,
      stageBPriceId: env.stageBPriceId,
      stageBNetworkCouponId: env.stageBNetworkCouponId,
      onConfirmation: sink,
      onOwnerPaid:
        ownerSink ??
        (async (notice) => {
          await deliverOwnerPaidNotice(env, notice, fetchImpl);
        }),
    },
  );
  if (!paid.ok) {
    if (paid.error === 'booking-missing') return json(500, { error: 'booking-missing' });
    if (paid.error === 'payment-required') return json(200, { received: true, status: 'ignored' });
    return json(500, { error: 'calendar' });
  }
  return json(200, { received: true, status: 'paid_scheduled' });
}

export async function handleConsultationRequest(
  request: Request,
  deps: ConsultationDeps = {},
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const known =
    path === '/api/consultation/availability' ||
    path === '/api/consultation/book' ||
    path === '/api/consultation/booking' ||
    path === '/api/consultation/network-link' ||
    path === '/api/consultation/network-status' ||
    path === '/api/stripe/webhook';
  if (!known) return json(404, { error: 'not-found' });
  const getOnly =
    path === '/api/consultation/availability' ||
    path === '/api/consultation/booking' ||
    path === '/api/consultation/network-status';
  if (getOnly && request.method !== 'GET') return json(405, { error: 'method' });
  if (!getOnly && request.method !== 'POST') return json(405, { error: 'method' });

  const env = deps.env ?? consultationEnvFromProcess();
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = (deps.now ?? (() => new Date()))();

  if (path === '/api/consultation/network-status') return networkStatus(request, env, now);
  if (path === '/api/consultation/network-link') return networkLink(request, env, now);

  const calendar = deps.calendar ?? calendarFromEnv(env, fetchImpl);
  if (!calendar) return json(503, { error: 'calendar-unconfigured' });

  if (path === '/api/consultation/availability') {
    return availability(request, calendar, now);
  }
  if (path === '/api/consultation/booking') {
    return bookingView(request, calendar);
  }
  if (path === '/api/stripe/webhook') {
    return webhook(request, env, calendar, now, fetchImpl, deps.onConfirmation, deps.onOwnerPaid);
  }

  const stripe = deps.stripe ?? stripeFromEnv(env.stripeSecretKey, fetchImpl);
  if (!stripe) return json(503, { error: 'stripe-unconfigured' });
  const bookingId = (deps.bookingId ?? (() => crypto.randomUUID()))();
  return book(request, env, calendar, stripe, now, bookingId);
}
