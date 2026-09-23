import { createSign } from 'node:crypto';
import { CONSULTATION_TIME_ZONE, type TimeInterval } from '../app/lib/consultation-book';
import type { ConsultationBooking } from './consultation-store';

export interface CalendarConfirmResult {
  readonly eventId: string;
  readonly meetLink: string;
  readonly already: boolean;
}

export interface CalendarGateway {
  busy(from: Date, to: Date): Promise<TimeInterval[]>;
  activeHolds(now: Date): Promise<TimeInterval[]>;
  purgeExpired(now: Date): Promise<void>;
  insertHold(booking: ConsultationBooking): Promise<string>;
  deleteEvent(eventId: string): Promise<void>;
  confirmPaid(booking: ConsultationBooking): Promise<CalendarConfirmResult>;
}

interface StoredEvent {
  id: string;
  bookingId: string;
  start: string;
  end: string;
  status: 'hold' | 'paid' | 'busy';
  expiresAt: string | null;
  meetLink: string | null;
  summary: string;
  attendee: string | null;
}

export class MemoryCalendar implements CalendarGateway {
  readonly events: StoredEvent[] = [];
  confirmCalls = 0;

  constructor(readonly externalBusy: TimeInterval[] = []) {}

  async busy(from: Date, to: Date): Promise<TimeInterval[]> {
    const start = from.getTime();
    const end = to.getTime();
    const own = this.events
      .filter((event) => Date.parse(event.start) < end && start < Date.parse(event.end))
      .map((event) => ({ start: event.start, end: event.end }));
    return [...this.externalBusy, ...own];
  }

  async activeHolds(now: Date): Promise<TimeInterval[]> {
    return this.events
      .filter((event) => event.status === 'hold' && this.holdIsLive(event, now.getTime()))
      .map((event) => ({ start: event.start, end: event.end }));
  }

  async purgeExpired(now: Date): Promise<void> {
    for (let index = this.events.length - 1; index >= 0; index -= 1) {
      const event = this.events[index];
      if (event && event.status === 'hold' && !this.holdIsLive(event, now.getTime())) {
        this.events.splice(index, 1);
      }
    }
  }

  async insertHold(booking: ConsultationBooking): Promise<string> {
    const id = `hold_${booking.id}`;
    this.events.push({
      id,
      bookingId: booking.id,
      start: booking.start,
      end: booking.end,
      status: 'hold',
      expiresAt: booking.expiresAt,
      meetLink: null,
      summary: 'Consultation hold',
      attendee: null,
    });
    return id;
  }

  async deleteEvent(eventId: string): Promise<void> {
    const index = this.events.findIndex((event) => event.id === eventId);
    if (index >= 0) this.events.splice(index, 1);
  }

  async confirmPaid(booking: ConsultationBooking): Promise<CalendarConfirmResult> {
    this.confirmCalls += 1;
    const existing = this.events.find(
      (event) => event.bookingId === booking.id && event.status === 'paid' && event.meetLink,
    );
    if (existing?.meetLink) {
      return { eventId: existing.id, meetLink: existing.meetLink, already: true };
    }
    const meetLink = `https://meet.google.com/lookup/${booking.id.slice(0, 8)}`;
    const hold = this.events.find((event) => event.bookingId === booking.id);
    if (hold) {
      hold.status = 'paid';
      hold.meetLink = meetLink;
      hold.attendee = booking.email;
      hold.summary = consultationSummary(booking.name);
      hold.expiresAt = null;
      return { eventId: hold.id, meetLink, already: false };
    }
    const id = `evt_${booking.id}`;
    this.events.push({
      id,
      bookingId: booking.id,
      start: booking.start,
      end: booking.end,
      status: 'paid',
      expiresAt: null,
      meetLink,
      summary: consultationSummary(booking.name),
      attendee: booking.email,
    });
    return { eventId: id, meetLink, already: false };
  }

  private holdIsLive(event: StoredEvent, nowMs: number): boolean {
    if (!event.expiresAt) return false;
    return Date.parse(event.expiresAt) > nowMs;
  }
}

export function consultationSummary(name: string): string {
  return `RevealUI Studio Consultation - ${name}`;
}

export function consultationDescription(booking: ConsultationBooking): string {
  const company = booking.company ? booking.company : 'not provided';
  return [
    'Consultation booked through RevealUI Studio.',
    `Company: ${company}`,
    'Desk: consultation_scheduled',
    'Prep: bring the critical path, what is live today, and the decision you want from the session.',
  ].join('\n');
}

interface GoogleEvent {
  id?: string;
  hangoutLink?: string;
  start?: { dateTime?: string };
  end?: { dateTime?: string };
  conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
  extendedProperties?: { private?: Record<string, string> };
}

interface TokenCache {
  token: string;
  expMs: number;
}

export interface GoogleCalendarOptions {
  readonly calendarId: string;
  readonly clientEmail: string;
  readonly privateKey: string;
  readonly impersonate?: string;
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => Date;
}

function base64url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

export function signServiceAccountJwt(input: {
  readonly clientEmail: string;
  readonly privateKey: string;
  readonly nowSec: number;
  readonly impersonate?: string;
}): string {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims: Record<string, string | number> = {
    iss: input.clientEmail,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    iat: input.nowSec,
    exp: input.nowSec + 3600,
  };
  if (input.impersonate) claims.sub = input.impersonate;
  const unsigned = `${header}.${base64url(JSON.stringify(claims))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(input.privateKey).toString('base64url')}`;
}

function meetLinkFrom(event: GoogleEvent): string | null {
  if (event.hangoutLink) return event.hangoutLink;
  const video = event.conferenceData?.entryPoints?.find(
    (entry) => entry.entryPointType === 'video',
  );
  return video?.uri ?? null;
}

export class GoogleCalendar implements CalendarGateway {
  private tokenCache: TokenCache | null = null;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;

  constructor(private readonly options: GoogleCalendarOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async busy(from: Date, to: Date): Promise<TimeInterval[]> {
    const payload = (await this.request('POST', 'https://www.googleapis.com/calendar/v3/freeBusy', {
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      timeZone: CONSULTATION_TIME_ZONE,
      items: [{ id: this.options.calendarId }],
    })) as { calendars?: Record<string, { busy?: Array<{ start?: string; end?: string }> }> };
    const busy = payload.calendars?.[this.options.calendarId]?.busy ?? [];
    return busy.flatMap((interval) => {
      if (!interval.start || !interval.end) return [];
      return [{ start: interval.start, end: interval.end }];
    });
  }

  async activeHolds(now: Date): Promise<TimeInterval[]> {
    const events = await this.listHolds();
    return events.flatMap((event) => {
      const start = event.start?.dateTime;
      const end = event.end?.dateTime;
      const expiresAt = event.extendedProperties?.private?.expiresAt;
      if (!start || !end || !expiresAt || Date.parse(expiresAt) <= now.getTime()) return [];
      return [{ start, end }];
    });
  }

  async purgeExpired(now: Date): Promise<void> {
    const events = await this.listHolds();
    for (const event of events) {
      const expiresAt = event.extendedProperties?.private?.expiresAt;
      const status = event.extendedProperties?.private?.studioStatus;
      if (!event.id || !expiresAt || status === 'paid_scheduled') continue;
      if (Date.parse(expiresAt) <= now.getTime()) await this.deleteEvent(event.id);
    }
  }

  async insertHold(booking: ConsultationBooking): Promise<string> {
    const created = (await this.request(
      'POST',
      this.eventsUrl({ sendUpdates: 'none' }),
      holdBody(booking),
    )) as GoogleEvent;
    if (!created.id) throw new Error('calendar');
    return created.id;
  }

  async deleteEvent(eventId: string): Promise<void> {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.options.calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=none`;
    await this.request('DELETE', url);
  }

  async confirmPaid(booking: ConsultationBooking): Promise<CalendarConfirmResult> {
    const found = await this.findByBooking(booking.id);
    const existingLink = found ? meetLinkFrom(found) : null;
    if (
      found?.id &&
      found.extendedProperties?.private?.studioStatus === 'paid_scheduled' &&
      existingLink
    ) {
      return { eventId: found.id, meetLink: existingLink, already: true };
    }
    const targetId = found?.id ?? booking.eventId;
    const saved = targetId
      ? ((await this.request(
          'PATCH',
          this.eventUrl(targetId, { conferenceDataVersion: '1', sendUpdates: 'all' }),
          confirmBody(booking),
        )) as GoogleEvent)
      : ((await this.request(
          'POST',
          this.eventsUrl({ conferenceDataVersion: '1', sendUpdates: 'all' }),
          confirmBody(booking),
        )) as GoogleEvent);
    let link = meetLinkFrom(saved);
    if (!link && saved.id) {
      const refreshed = (await this.request('GET', this.eventUrl(saved.id, {}))) as GoogleEvent;
      link = meetLinkFrom(refreshed);
    }
    if (!saved.id || !link) throw new Error('calendar');
    return { eventId: saved.id, meetLink: link, already: false };
  }

  private eventsUrl(query: Record<string, string>): string {
    const params = new URLSearchParams(query);
    return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.options.calendarId)}/events?${params}`;
  }

  private eventUrl(eventId: string, query: Record<string, string>): string {
    const params = new URLSearchParams(query);
    const suffix = params.toString() ? `?${params}` : '';
    return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.options.calendarId)}/events/${encodeURIComponent(eventId)}${suffix}`;
  }

  private async listHolds(): Promise<GoogleEvent[]> {
    const params = new URLSearchParams({
      privateExtendedProperty: 'studioHold=1',
      singleEvents: 'true',
      showDeleted: 'false',
      maxResults: '250',
    });
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.options.calendarId)}/events?${params}`;
    const payload = (await this.request('GET', url)) as { items?: GoogleEvent[] };
    return payload.items ?? [];
  }

  private async findByBooking(bookingId: string): Promise<GoogleEvent | null> {
    const params = new URLSearchParams({
      privateExtendedProperty: `bookingId=${bookingId}`,
      singleEvents: 'true',
      showDeleted: 'false',
      maxResults: '5',
    });
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.options.calendarId)}/events?${params}`;
    const payload = (await this.request('GET', url)) as { items?: GoogleEvent[] };
    return payload.items?.[0] ?? null;
  }

  private async token(): Promise<string> {
    const nowMs = this.now().getTime();
    if (this.tokenCache && this.tokenCache.expMs - 60_000 > nowMs) return this.tokenCache.token;
    const assertion = signServiceAccountJwt({
      clientEmail: this.options.clientEmail,
      privateKey: this.options.privateKey,
      nowSec: Math.floor(nowMs / 1000),
      impersonate: this.options.impersonate,
    });
    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    });
    const response = await this.fetchImpl('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) throw new Error('calendar');
    const payload = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!payload.access_token) throw new Error('calendar');
    this.tokenCache = {
      token: payload.access_token,
      expMs: nowMs + (payload.expires_in ?? 3600) * 1000,
    };
    return payload.access_token;
  }

  private async request(method: string, url: string, body?: unknown): Promise<unknown> {
    const token = await this.token();
    const response = await this.fetchImpl(url, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (method === 'DELETE') {
      if (!response.ok && response.status !== 404) throw new Error('calendar');
      return null;
    }
    if (!response.ok) throw new Error('calendar');
    return response.json();
  }
}

function privateProps(
  booking: ConsultationBooking,
  status: 'slot_held' | 'paid_scheduled',
): Record<string, string> {
  return {
    bookingId: booking.id,
    studioHold: status === 'slot_held' ? '1' : '0',
    studioStatus: status,
    expiresAt: booking.expiresAt,
    buyerEmail: booking.email,
    buyerName: booking.name,
    company: booking.company,
    hours: String(booking.hours),
    stageB: booking.stageB ? 'true' : 'false',
  };
}

function holdBody(booking: ConsultationBooking): Record<string, unknown> {
  return {
    summary: 'Consultation hold',
    status: 'tentative',
    transparency: 'opaque',
    visibility: 'private',
    start: { dateTime: booking.start, timeZone: CONSULTATION_TIME_ZONE },
    end: { dateTime: booking.end, timeZone: CONSULTATION_TIME_ZONE },
    extendedProperties: { private: privateProps(booking, 'slot_held') },
  };
}

/**
 * Guest-first Meet: the buyer is the attendee on the founder event, and
 * Calendar sends the invite (`sendUpdates=all`) with the Meet join link.
 */
function confirmBody(booking: ConsultationBooking): Record<string, unknown> {
  return {
    summary: consultationSummary(booking.name),
    description: consultationDescription(booking),
    status: 'confirmed',
    transparency: 'opaque',
    visibility: 'private',
    start: { dateTime: booking.start, timeZone: CONSULTATION_TIME_ZONE },
    end: { dateTime: booking.end, timeZone: CONSULTATION_TIME_ZONE },
    attendees: [{ email: booking.email }],
    guestsCanInviteOthers: false,
    guestsCanModify: false,
    guestsCanSeeOtherGuests: true,
    conferenceData: {
      createRequest: {
        requestId: booking.id,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
    extendedProperties: { private: privateProps(booking, 'paid_scheduled') },
  };
}
