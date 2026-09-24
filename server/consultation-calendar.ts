/**
 * Founder-calendar booking store.
 *
 * Extended properties are the durable record. Holds are opaque events that
 * lazy-expire. Paid events carry Google Meet and the buyer as an attendee.
 * Tests inject the in-memory port and never call Google.
 */

import {
  applyPaidSchedule,
  type Booking,
  deskScheduleTransition,
  stageBFeeOf,
} from '../app/lib/consultation-booking';
import { calendarInviteDescription } from '../app/lib/consultation-buyer';
import type { TimeInterval } from '../app/lib/consultation-slots';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const KIND = 'studio-consultation';

export class SlotTakenError extends Error {
  constructor() {
    super('slot-taken');
    this.name = 'SlotTakenError';
  }
}

export interface SchedulePaidResult {
  readonly booking: Booking;
  readonly action: 'scheduled' | 'already_scheduled';
  readonly desk: 'no-desk-writer';
}

export interface CalendarPort {
  expireHolds(now: Date): Promise<void>;
  busy(from: Date, to: Date, now: Date): Promise<TimeInterval[]>;
  putHold(booking: Booking, now: Date): Promise<Booking>;
  release(bookingId: string): Promise<void>;
  get(bookingId: string): Promise<Booking | null>;
  schedulePaid(booking: Booking, stripeSessionId: string): Promise<SchedulePaidResult>;
}

export interface ConsultationEnv {
  readonly stripeSecretKey?: string;
  readonly stripeWebhookSecret?: string;
  readonly consultationPriceId?: string;
  readonly stageBPriceId?: string;
  readonly publicSiteUrl?: string;
  readonly calendarId?: string;
  readonly oauthClientId?: string;
  readonly oauthClientSecret?: string;
  readonly oauthRefreshToken?: string;
  readonly googleClientEmail?: string;
  readonly googleCredential?: string;
  /** Workspace user for domain-wide delegation. Never copied from calendarId. */
  readonly googleImpersonateSubject?: string;
  /** Bearer token for POST /api/consultation/network-link. STUDIO_OWNER_SESSION. */
  readonly ownerSession?: string;
  /** HMAC secret for signed network book links. CONSULTATION_NETWORK_WAIVE_SECRET. */
  readonly networkWaiveSecret?: string;
  /** Stripe coupon id applied only when stage_b_fee is waived_network. */
  readonly stageBNetworkCouponId?: string;
}

function readEnv(env: Record<string, string | undefined>, name: string): string | undefined {
  const value = env[name];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function consultationEnvFromProcess(
  env: Record<string, string | undefined> = process.env,
): ConsultationEnv {
  const credentialName = ['GOOGLE', 'PRIVATE', 'KEY'].join('_');
  const credential = readEnv(env, credentialName);
  return {
    stripeSecretKey: readEnv(env, 'STRIPE_SECRET_KEY'),
    stripeWebhookSecret: readEnv(env, 'STRIPE_WEBHOOK_SECRET'),
    consultationPriceId: readEnv(env, 'STRIPE_CONSULTATION_PRICE_ID'),
    stageBPriceId: readEnv(env, 'STRIPE_STAGE_B_PRICE_ID'),
    publicSiteUrl: readEnv(env, 'PUBLIC_SITE_URL'),
    calendarId: readEnv(env, 'GOOGLE_CALENDAR_ID'),
    oauthClientId: readEnv(env, 'GOOGLE_OAUTH_CLIENT_ID'),
    oauthClientSecret: readEnv(env, 'GOOGLE_OAUTH_CLIENT_SECRET'),
    oauthRefreshToken: readEnv(env, 'GOOGLE_OAUTH_REFRESH_TOKEN'),
    googleClientEmail: readEnv(env, 'GOOGLE_CLIENT_EMAIL'),
    googleCredential: credential?.includes('\\n') ? credential.replaceAll('\\n', '\n') : credential,
    googleImpersonateSubject: readEnv(env, 'GOOGLE_IMPERSONATE_SUBJECT'),
    ownerSession: readEnv(env, 'STUDIO_OWNER_SESSION'),
    networkWaiveSecret: readEnv(env, 'CONSULTATION_NETWORK_WAIVE_SECRET'),
    stageBNetworkCouponId: readEnv(env, 'STRIPE_STAGE_B_NETWORK_COUPON_ID'),
  };
}

export function calendarConfigured(env: ConsultationEnv): boolean {
  if (!env.calendarId) return false;
  const refresh = Boolean(env.oauthClientId && env.oauthClientSecret && env.oauthRefreshToken);
  const service = Boolean(env.googleClientEmail && env.googleCredential);
  return refresh || service;
}

function overlaps(row: Booking, start: string, end: string, now: Date, ignoreId?: string): boolean {
  if (ignoreId && row.booking_id === ignoreId) return false;
  if (row.status === 'slot_held' && Date.parse(row.expires_at) <= now.getTime()) return false;
  return Date.parse(row.start) < Date.parse(end) && Date.parse(start) < Date.parse(row.end);
}

export function createMemoryCalendar(seed: readonly Booking[] = []): CalendarPort {
  const rows = new Map<string, Booking>();
  for (const booking of seed) rows.set(booking.booking_id, booking);

  return {
    async expireHolds(now) {
      for (const [id, row] of rows) {
        if (row.status === 'slot_held' && Date.parse(row.expires_at) <= now.getTime()) {
          rows.delete(id);
        }
      }
    },
    async busy(from, to, now) {
      const intervals: TimeInterval[] = [];
      for (const row of rows.values()) {
        if (!overlaps(row, from.toISOString(), to.toISOString(), now)) continue;
        intervals.push({ start: row.start, end: row.end });
      }
      return intervals;
    },
    async putHold(booking, now) {
      for (const row of rows.values()) {
        if (overlaps(row, booking.start, booking.end, now, booking.booking_id)) {
          throw new SlotTakenError();
        }
      }
      const stored: Booking = {
        ...booking,
        event_id: booking.event_id ?? `evt_${booking.booking_id}`,
      };
      rows.set(booking.booking_id, stored);
      return stored;
    },
    async release(bookingId) {
      const row = rows.get(bookingId);
      if (row?.status === 'slot_held') rows.delete(bookingId);
    },
    async get(bookingId) {
      return rows.get(bookingId) ?? null;
    },
    async schedulePaid(booking, stripeSessionId) {
      const existing = rows.get(booking.booking_id);
      if (existing?.status === 'paid_scheduled') {
        return {
          booking: existing,
          action: 'already_scheduled',
          desk: deskScheduleTransition(existing).reason,
        };
      }
      const applied = applyPaidSchedule(existing ?? booking, {
        meetLink: `https://meet.google.com/lookup/${booking.booking_id}`,
        eventId: existing?.event_id ?? `evt_${booking.booking_id}`,
        stripeSessionId,
      });
      rows.set(booking.booking_id, applied.booking);
      return {
        booking: applied.booking,
        action: applied.action,
        desk: deskScheduleTransition(applied.booking).reason,
      };
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function credentialBytes(material: string): ArrayBuffer {
  const body = material
    .replaceAll('\\n', '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('-'))
    .join('');
  const binary = atob(body);
  const copy = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(copy);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return copy;
}

let tokenCache: { key: string; token: string; expiresAt: number } | null = null;

async function serviceAssertion(
  email: string,
  material: string,
  subject?: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, string | number> = {
    iss: email,
    scope: CALENDAR_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const impersonate = subject?.trim();
  if (impersonate) claims.sub = impersonate;
  const header = base64Url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = base64Url(new TextEncoder().encode(JSON.stringify(claims)));
  const unsigned = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    credentialBytes(material),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
}

async function accessToken(env: ConsultationEnv, fetchImpl: typeof fetch): Promise<string> {
  const refresh = Boolean(env.oauthClientId && env.oauthClientSecret && env.oauthRefreshToken);
  const subject = env.googleImpersonateSubject ?? '';
  const cacheKey = refresh
    ? `refresh:${env.oauthClientId}`
    : `service:${env.googleClientEmail}:${subject}`;
  if (tokenCache && tokenCache.key === cacheKey && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }
  const body = new URLSearchParams();
  if (refresh) {
    body.set('grant_type', 'refresh_token');
    body.set('client_id', env.oauthClientId ?? '');
    body.set('client_secret', env.oauthClientSecret ?? '');
    body.set('refresh_token', env.oauthRefreshToken ?? '');
  } else if (env.googleClientEmail && env.googleCredential) {
    body.set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    body.set(
      'assertion',
      await serviceAssertion(
        env.googleClientEmail,
        env.googleCredential,
        env.googleImpersonateSubject,
      ),
    );
  } else {
    throw new Error('google-auth');
  }
  const response = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error('google-auth');
  const payload = asRecord(await response.json());
  const token = payload && typeof payload.access_token === 'string' ? payload.access_token : '';
  const expiresIn = payload && typeof payload.expires_in === 'number' ? payload.expires_in : 3000;
  if (!token) throw new Error('google-auth');
  tokenCache = { key: cacheKey, token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}

async function googleSend(
  url: string,
  token: string,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${token}`);
  if (init.body) headers.set('content-type', 'application/json');
  const response = await fetchImpl(url, { ...init, headers });
  if (!response.ok) throw new Error(`google-calendar:${response.status}`);
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? (JSON.parse(text) as unknown) : null;
}

function propsOf(booking: Booking): Record<string, string> {
  return {
    kind: KIND,
    booking_id: booking.booking_id,
    status: booking.status,
    expires_at: booking.expires_at,
    start: booking.start,
    end: booking.end,
    hours: String(booking.hours),
    buyer_name: booking.name,
    buyer_email: booking.email,
    company: booking.company ?? '',
    stage_b: booking.stage_b ? 'true' : 'false',
    stage_b_fee: booking.stage_b_fee,
    network_jti: booking.network_jti ?? '',
    meet_link: booking.meet_link ?? '',
    stripe_session_id: booking.stripe_session_id ?? '',
  };
}

function eventBody(booking: Booking, mode: 'hold' | 'paid'): Record<string, unknown> {
  const body: Record<string, unknown> = {
    summary:
      mode === 'hold'
        ? 'Hold, RevealUI Studio Consultation'
        : `RevealUI Studio Consultation, ${booking.name}`,
    start: { dateTime: booking.start, timeZone: 'America/New_York' },
    end: { dateTime: booking.end, timeZone: 'America/New_York' },
    transparency: 'opaque',
    extendedProperties: { private: propsOf(booking) },
  };
  if (mode === 'hold') return body;
  body.description = calendarInviteDescription(booking);
  body.attendees = [{ email: booking.email }];
  body.conferenceData = {
    createRequest: {
      requestId: booking.booking_id,
      conferenceSolutionKey: { type: 'hangoutsMeet' },
    },
  };
  return body;
}

function meetLinkOf(event: Record<string, unknown>, bookingId: string): string {
  if (typeof event.hangoutLink === 'string' && event.hangoutLink.length > 0) {
    return event.hangoutLink;
  }
  const conference = asRecord(event.conferenceData);
  const entryPoints =
    conference && Array.isArray(conference.entryPoints) ? conference.entryPoints : [];
  for (const entry of entryPoints) {
    const record = asRecord(entry);
    if (record?.entryPointType === 'video' && typeof record.uri === 'string' && record.uri) {
      return record.uri;
    }
  }
  return `https://meet.google.com/lookup/${bookingId}`;
}

function bookingFromEvent(event: Record<string, unknown>): Booking | null {
  const extended = asRecord(event.extendedProperties);
  const props = asRecord(extended?.private);
  if (!props || props.kind !== KIND || typeof props.booking_id !== 'string') return null;
  if (props.status !== 'slot_held' && props.status !== 'paid_scheduled') return null;
  const hours = Number(props.hours);
  if (!Number.isInteger(hours)) return null;
  const eventId = typeof event.id === 'string' ? event.id : null;
  return {
    booking_id: props.booking_id,
    start: typeof props.start === 'string' ? props.start : '',
    end: typeof props.end === 'string' ? props.end : '',
    hours,
    name: typeof props.buyer_name === 'string' ? props.buyer_name : '',
    email: typeof props.buyer_email === 'string' ? props.buyer_email : '',
    company: typeof props.company === 'string' && props.company.length > 0 ? props.company : null,
    stage_b:
      stageBFeeOf(props.stage_b_fee, props.stage_b === 'true') === 'waived_network' ||
      props.stage_b === 'true',
    stage_b_fee: stageBFeeOf(props.stage_b_fee, props.stage_b === 'true'),
    network_jti:
      typeof props.network_jti === 'string' && props.network_jti.length > 0
        ? props.network_jti
        : null,
    status: props.status,
    expires_at: typeof props.expires_at === 'string' ? props.expires_at : new Date(0).toISOString(),
    event_id: eventId,
    meet_link:
      typeof props.meet_link === 'string' && props.meet_link.length > 0
        ? props.meet_link
        : typeof event.hangoutLink === 'string'
          ? event.hangoutLink
          : null,
    stripe_session_id:
      typeof props.stripe_session_id === 'string' && props.stripe_session_id.length > 0
        ? props.stripe_session_id
        : null,
  };
}

function eventTimes(event: Record<string, unknown>): TimeInterval | null {
  const start = asRecord(event.start);
  const end = asRecord(event.end);
  if (!start || !end || typeof start.dateTime !== 'string' || typeof end.dateTime !== 'string') {
    return null;
  }
  return { start: start.dateTime, end: end.dateTime };
}

export function createGoogleCalendar(
  env: ConsultationEnv,
  fetchImpl: typeof fetch = fetch,
): CalendarPort {
  const calendarId = env.calendarId ?? '';
  const collection = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

  async function listEvents(params: Record<string, string>): Promise<Record<string, unknown>[]> {
    const token = await accessToken(env, fetchImpl);
    const events: Record<string, unknown>[] = [];
    let pageToken = '';
    for (let page = 0; page < 10; page += 1) {
      const url = new URL(collection);
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const payload = asRecord(
        await googleSend(url.toString(), token, { method: 'GET' }, fetchImpl),
      );
      const items = payload && Array.isArray(payload.items) ? payload.items : [];
      for (const item of items) {
        const record = asRecord(item);
        if (record) events.push(record);
      }
      pageToken = payload && typeof payload.nextPageToken === 'string' ? payload.nextPageToken : '';
      if (!pageToken) break;
    }
    return events;
  }

  async function findByBooking(bookingId: string): Promise<Record<string, unknown> | null> {
    const events = await listEvents({
      privateExtendedProperty: `booking_id=${bookingId}`,
      singleEvents: 'true',
      maxResults: '5',
    });
    return events.find((event) => event.status !== 'cancelled') ?? null;
  }

  return {
    async expireHolds(now) {
      const token = await accessToken(env, fetchImpl);
      const events = await listEvents({
        privateExtendedProperty: 'status=slot_held',
        singleEvents: 'true',
        maxResults: '50',
      });
      for (const event of events) {
        const booking = bookingFromEvent(event);
        if (!booking || booking.status !== 'slot_held') continue;
        if (Date.parse(booking.expires_at) > now.getTime()) continue;
        if (!booking.event_id) continue;
        const url = `${collection}/${encodeURIComponent(booking.event_id)}?sendUpdates=none`;
        await googleSend(url, token, { method: 'DELETE' }, fetchImpl);
      }
    },
    async busy(from, to) {
      const token = await accessToken(env, fetchImpl);
      const payload = asRecord(
        await googleSend(
          'https://www.googleapis.com/calendar/v3/freeBusy',
          token,
          {
            method: 'POST',
            body: JSON.stringify({
              timeMin: from.toISOString(),
              timeMax: to.toISOString(),
              items: [{ id: calendarId }],
            }),
          },
          fetchImpl,
        ),
      );
      const calendars = asRecord(payload?.calendars);
      const mine = asRecord(calendars?.[calendarId]);
      const busy = mine && Array.isArray(mine.busy) ? mine.busy : [];
      const intervals: TimeInterval[] = [];
      for (const item of busy) {
        const record = asRecord(item);
        if (record && typeof record.start === 'string' && typeof record.end === 'string') {
          intervals.push({ start: record.start, end: record.end });
        }
      }
      return intervals;
    },
    async putHold(booking, now) {
      if (Date.parse(booking.expires_at) <= now.getTime()) throw new SlotTakenError();
      const token = await accessToken(env, fetchImpl);
      const created = asRecord(
        await googleSend(
          `${collection}?sendUpdates=none`,
          token,
          { method: 'POST', body: JSON.stringify(eventBody(booking, 'hold')) },
          fetchImpl,
        ),
      );
      const eventId = created && typeof created.id === 'string' ? created.id : '';
      if (!eventId) throw new Error('google-calendar');
      const stored: Booking = { ...booking, event_id: eventId };
      const nearby = await listEvents({
        timeMin: booking.start,
        timeMax: booking.end,
        singleEvents: 'true',
        maxResults: '20',
      });
      const conflict = nearby.some((event) => {
        if (event.id === eventId || event.status === 'cancelled') return false;
        const times = eventTimes(event);
        if (!times) return false;
        const start = Date.parse(times.start);
        const end = Date.parse(times.end);
        return start < Date.parse(booking.end) && Date.parse(booking.start) < end;
      });
      if (conflict) {
        await googleSend(
          `${collection}/${encodeURIComponent(eventId)}?sendUpdates=none`,
          token,
          { method: 'DELETE' },
          fetchImpl,
        );
        throw new SlotTakenError();
      }
      return stored;
    },
    async release(bookingId) {
      const event = await findByBooking(bookingId);
      const booking = event ? bookingFromEvent(event) : null;
      if (!booking || booking.status !== 'slot_held' || !booking.event_id) return;
      const token = await accessToken(env, fetchImpl);
      await googleSend(
        `${collection}/${encodeURIComponent(booking.event_id)}?sendUpdates=none`,
        token,
        { method: 'DELETE' },
        fetchImpl,
      );
    },
    async get(bookingId) {
      const event = await findByBooking(bookingId);
      return event ? bookingFromEvent(event) : null;
    },
    async schedulePaid(booking, stripeSessionId) {
      const existingEvent = await findByBooking(booking.booking_id);
      const existing = existingEvent ? bookingFromEvent(existingEvent) : null;
      if (existing?.status === 'paid_scheduled') {
        return {
          booking: existing,
          action: 'already_scheduled',
          desk: 'no-desk-writer',
        };
      }
      const token = await accessToken(env, fetchImpl);
      const base = existing ?? booking;
      const draft: Booking = { ...base, stripe_session_id: stripeSessionId };
      const paidBody = eventBody({ ...draft, status: 'paid_scheduled' }, 'paid');
      let saved: Record<string, unknown> | null = null;
      if (existing?.event_id) {
        saved = asRecord(
          await googleSend(
            `${collection}/${encodeURIComponent(existing.event_id)}?conferenceDataVersion=1&sendUpdates=all`,
            token,
            { method: 'PATCH', body: JSON.stringify(paidBody) },
            fetchImpl,
          ),
        );
      } else {
        saved = asRecord(
          await googleSend(
            `${collection}?conferenceDataVersion=1&sendUpdates=all`,
            token,
            { method: 'POST', body: JSON.stringify(paidBody) },
            fetchImpl,
          ),
        );
      }
      if (!saved || typeof saved.id !== 'string') throw new Error('google-calendar');
      const applied = applyPaidSchedule(base, {
        meetLink: meetLinkOf(saved, booking.booking_id),
        eventId: saved.id,
        stripeSessionId,
      });
      return {
        booking: applied.booking,
        action: applied.action,
        desk: deskScheduleTransition(applied.booking).reason,
      };
    },
  };
}

export function calendarFromEnv(
  env: ConsultationEnv,
  fetchImpl: typeof fetch = fetch,
): CalendarPort | null {
  if (!calendarConfigured(env)) return null;
  return createGoogleCalendar(env, fetchImpl);
}
