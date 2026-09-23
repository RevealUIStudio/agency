export type BookingStatus = 'slot_held' | 'paid_scheduled' | 'cancelled';

export interface ConsultationBooking {
  readonly id: string;
  readonly start: string;
  readonly end: string;
  readonly hours: number;
  readonly name: string;
  readonly email: string;
  readonly company: string;
  readonly stageB: boolean;
  readonly status: BookingStatus;
  readonly expiresAt: string;
  readonly checkoutSessionId: string | null;
  readonly eventId: string | null;
  readonly meetLink: string | null;
  readonly createdAt: string;
  readonly paidAt: string | null;
}

export interface PaidPatch {
  readonly eventId: string;
  readonly meetLink: string;
  readonly paidAt: string;
  readonly checkoutSessionId: string | null;
}

export interface BookingStore {
  save(booking: ConsultationBooking): Promise<void>;
  get(id: string): Promise<ConsultationBooking | null>;
  claimHours(
    starts: readonly string[],
    bookingId: string,
    expiresAtMs: number,
    nowMs: number,
  ): Promise<boolean>;
  releaseHours(starts: readonly string[], bookingId: string): Promise<void>;
  activeHolds(nowMs: number): Promise<ConsultationBooking[]>;
  acquireScheduleLock(id: string): Promise<boolean>;
  releaseScheduleLock(id: string): Promise<void>;
  commitPaid(booking: ConsultationBooking, patch: PaidPatch): Promise<'updated' | 'duplicate'>;
}

interface SlotClaim {
  readonly bookingId: string;
  readonly expiresAtMs: number;
}

export class MemoryBookingStore implements BookingStore {
  private readonly bookings = new Map<string, ConsultationBooking>();
  private readonly claims = new Map<string, SlotClaim>();
  private readonly locks = new Set<string>();

  async save(booking: ConsultationBooking): Promise<void> {
    this.bookings.set(booking.id, booking);
  }

  async get(id: string): Promise<ConsultationBooking | null> {
    return this.bookings.get(id) ?? null;
  }

  async claimHours(
    starts: readonly string[],
    bookingId: string,
    expiresAtMs: number,
    nowMs: number,
  ): Promise<boolean> {
    for (const start of starts) {
      const current = this.claims.get(start);
      if (current && current.expiresAtMs > nowMs && current.bookingId !== bookingId) return false;
    }
    for (const start of starts) this.claims.set(start, { bookingId, expiresAtMs });
    return true;
  }

  async releaseHours(starts: readonly string[], bookingId: string): Promise<void> {
    for (const start of starts) {
      const current = this.claims.get(start);
      if (current?.bookingId === bookingId) this.claims.delete(start);
    }
  }

  async activeHolds(nowMs: number): Promise<ConsultationBooking[]> {
    return [...this.bookings.values()].filter(
      (booking) => booking.status === 'slot_held' && Date.parse(booking.expiresAt) > nowMs,
    );
  }

  async acquireScheduleLock(id: string): Promise<boolean> {
    if (this.locks.has(id)) return false;
    this.locks.add(id);
    return true;
  }

  async releaseScheduleLock(id: string): Promise<void> {
    this.locks.delete(id);
  }

  async commitPaid(
    booking: ConsultationBooking,
    patch: PaidPatch,
  ): Promise<'updated' | 'duplicate'> {
    const current = this.bookings.get(booking.id);
    if (current?.status === 'paid_scheduled') return 'duplicate';
    this.bookings.set(booking.id, {
      ...(current ?? booking),
      eventId: patch.eventId,
      meetLink: patch.meetLink,
      paidAt: patch.paidAt,
      checkoutSessionId:
        patch.checkoutSessionId ?? current?.checkoutSessionId ?? booking.checkoutSessionId,
      status: 'paid_scheduled',
    });
    return 'updated';
  }
}

const processMemoryStore = new MemoryBookingStore();

interface RedisResult {
  readonly result?: unknown;
  readonly error?: string;
}

export class UpstashBookingStore implements BookingStore {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly now: () => number = () => Date.now(),
  ) {}

  private async command(args: readonly (string | number)[]): Promise<unknown> {
    const response = await this.fetchImpl(this.url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    const payload = (await response.json()) as RedisResult;
    if (!response.ok || payload.error) throw new Error('store');
    return payload.result;
  }

  private bookingKey(id: string): string {
    return `consultation:booking:${id}`;
  }

  async save(booking: ConsultationBooking): Promise<void> {
    const ttl =
      booking.status === 'paid_scheduled'
        ? 90 * 24 * 3600
        : Math.max(60, Math.ceil((Date.parse(booking.expiresAt) - this.now()) / 1000));
    await this.command(['SET', this.bookingKey(booking.id), JSON.stringify(booking), 'EX', ttl]);
    if (booking.status === 'slot_held') {
      await this.command(['SADD', 'consultation:hold-index', booking.id]);
    } else {
      await this.command(['SREM', 'consultation:hold-index', booking.id]);
    }
  }

  async get(id: string): Promise<ConsultationBooking | null> {
    const raw = await this.command(['GET', this.bookingKey(id)]);
    if (typeof raw !== 'string' || !raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as ConsultationBooking;
  }

  async claimHours(
    starts: readonly string[],
    bookingId: string,
    expiresAtMs: number,
    nowMs: number,
  ): Promise<boolean> {
    const ttl = Math.max(60, Math.ceil((expiresAtMs - nowMs) / 1000));
    const claimed: string[] = [];
    for (const start of starts) {
      const result = await this.command([
        'SET',
        `consultation:slot:${start}`,
        bookingId,
        'NX',
        'EX',
        ttl,
      ]);
      if (result === 'OK') {
        claimed.push(start);
        continue;
      }
      const owner = await this.command(['GET', `consultation:slot:${start}`]);
      if (owner === bookingId) {
        claimed.push(start);
        continue;
      }
      await this.releaseHours(claimed, bookingId);
      return false;
    }
    return true;
  }

  async releaseHours(starts: readonly string[], bookingId: string): Promise<void> {
    for (const start of starts) {
      const owner = await this.command(['GET', `consultation:slot:${start}`]);
      if (owner === bookingId) await this.command(['DEL', `consultation:slot:${start}`]);
    }
  }

  async activeHolds(nowMs: number): Promise<ConsultationBooking[]> {
    const ids = await this.command(['SMEMBERS', 'consultation:hold-index']);
    if (!Array.isArray(ids)) return [];
    const holds: ConsultationBooking[] = [];
    for (const id of ids) {
      if (typeof id !== 'string') continue;
      const booking = await this.get(id);
      if (booking === null || booking.status !== 'slot_held') {
        await this.command(['SREM', 'consultation:hold-index', id]);
        continue;
      }
      if (Date.parse(booking.expiresAt) <= nowMs) {
        await this.command(['SREM', 'consultation:hold-index', id]);
        continue;
      }
      holds.push(booking);
    }
    return holds;
  }

  async acquireScheduleLock(id: string): Promise<boolean> {
    const result = await this.command([
      'SET',
      `consultation:scheduling:${id}`,
      '1',
      'NX',
      'EX',
      120,
    ]);
    return result === 'OK';
  }

  async releaseScheduleLock(id: string): Promise<void> {
    await this.command(['DEL', `consultation:scheduling:${id}`]);
  }

  async commitPaid(
    booking: ConsultationBooking,
    patch: PaidPatch,
  ): Promise<'updated' | 'duplicate'> {
    const won = await this.command([
      'SET',
      `consultation:paid:${booking.id}`,
      patch.meetLink,
      'NX',
      'EX',
      90 * 24 * 3600,
    ]);
    if (won !== 'OK') return 'duplicate';
    const current = (await this.get(booking.id)) ?? booking;
    await this.save({
      ...current,
      eventId: patch.eventId,
      meetLink: patch.meetLink,
      paidAt: patch.paidAt,
      checkoutSessionId: patch.checkoutSessionId ?? current.checkoutSessionId,
      status: 'paid_scheduled',
    });
    return 'updated';
  }
}

export function createBookingStore(env: {
  readonly url?: string;
  readonly token?: string;
}): BookingStore {
  if (env.url && env.token) return new UpstashBookingStore(env.url, env.token);
  return processMemoryStore;
}
