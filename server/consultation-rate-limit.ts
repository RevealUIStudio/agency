/**
 * Best-effort throttle for consultation availability, booking, and booking lookup.
 *
 * Each availability read lists held calendar events (up to 50). A burst from one
 * address can burn that quota. This limiter counts requests in a fixed window,
 * keyed by caller address, and returns 429 with Retry-After when the window is full.
 *
 * The maps live in this process. Serverless instances do not share memory, so a
 * flood can still land on many instances. This is a first line against accidental
 * loops and single-instance abuse. There is no background timer: expired rows are
 * dropped on a later request, and both maps stay under a fixed cap.
 *
 * This server has no shared store. If one is added later, the upgrade path is an
 * atomic increment per route and address with the same window, limit, and
 * Retry-After contract. Replace the maps in this module and keep the behavior below.
 *
 * Identical availability queries share one in-flight calendar read and a short
 * result cache. The cached body is the public slot list. Booking writes are not
 * cached. A few seconds of staleness is safe because a taken slot still fails
 * when the booking is saved.
 */

const UNKNOWN_ADDRESS = 'unknown';

export const CONSULTATION_RATE_DEFAULTS = {
  availabilityPerMinute: 30,
  bookPerMinute: 10,
  bookingPerMinute: 30,
  windowMs: 60_000,
  maxKeys: 4_096,
  availabilityCacheMs: 5_000,
} as const;

export interface ConsultationRateConfig {
  readonly availabilityPerMinute: number;
  readonly bookPerMinute: number;
  readonly bookingPerMinute: number;
  readonly windowMs: number;
  readonly maxKeys: number;
  readonly availabilityCacheMs: number;
}

export type ConsultationRoute = 'availability' | 'book' | 'booking';

export interface ConsultationThrottle {
  consume(request: Request, path: string, nowMs: number): Response | null;
  loadAvailability<T>(key: string, nowMs: number, load: () => Promise<T>): Promise<T>;
  keyCount(): number;
  cacheCount(): number;
}

interface Bucket {
  windowStart: number;
  count: number;
}

interface CacheEntry {
  body: unknown;
  storedAt: number;
}

function readEnv(env: Record<string, string | undefined>, name: string): string | undefined {
  const value = env[name];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Missing, blank, or out-of-range values keep the default. A bad deploy cannot
 * open the route or raise the cap without bound.
 *
 * CONSULTATION_RATE_AVAILABILITY_PER_MIN default 30, range 1 to 1000
 * CONSULTATION_RATE_BOOK_PER_MIN default 10, range 1 to 1000
 * CONSULTATION_RATE_BOOKING_PER_MIN default 30, range 1 to 1000
 * CONSULTATION_RATE_WINDOW_MS default 60000, range 1000 to 600000
 * CONSULTATION_RATE_MAX_KEYS default 4096, range 32 to 100000
 * CONSULTATION_AVAILABILITY_CACHE_MS default 5000, range 0 to 60000
 */
export function consultationRateConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): ConsultationRateConfig {
  return {
    availabilityPerMinute: readBoundedInt(
      env,
      'CONSULTATION_RATE_AVAILABILITY_PER_MIN',
      CONSULTATION_RATE_DEFAULTS.availabilityPerMinute,
      1,
      1_000,
    ),
    bookPerMinute: readBoundedInt(
      env,
      'CONSULTATION_RATE_BOOK_PER_MIN',
      CONSULTATION_RATE_DEFAULTS.bookPerMinute,
      1,
      1_000,
    ),
    bookingPerMinute: readBoundedInt(
      env,
      'CONSULTATION_RATE_BOOKING_PER_MIN',
      CONSULTATION_RATE_DEFAULTS.bookingPerMinute,
      1,
      1_000,
    ),
    windowMs: readBoundedInt(
      env,
      'CONSULTATION_RATE_WINDOW_MS',
      CONSULTATION_RATE_DEFAULTS.windowMs,
      1_000,
      600_000,
    ),
    maxKeys: readBoundedInt(
      env,
      'CONSULTATION_RATE_MAX_KEYS',
      CONSULTATION_RATE_DEFAULTS.maxKeys,
      32,
      100_000,
    ),
    availabilityCacheMs: readBoundedInt(
      env,
      'CONSULTATION_AVAILABILITY_CACHE_MS',
      CONSULTATION_RATE_DEFAULTS.availabilityCacheMs,
      0,
      60_000,
    ),
  };
}

function readBoundedInt(
  env: Record<string, string | undefined>,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = readEnv(env, name);
  if (raw === undefined || !/^[0-9]+$/u.test(raw)) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) return fallback;
  return value;
}

function routeForPath(path: string): ConsultationRoute | null {
  if (path === '/api/consultation/availability') return 'availability';
  if (path === '/api/consultation/book') return 'book';
  if (path === '/api/consultation/booking') return 'booking';
  return null;
}

function limitFor(config: ConsultationRateConfig, route: ConsultationRoute): number {
  if (route === 'availability') return config.availabilityPerMinute;
  if (route === 'book') return config.bookPerMinute;
  return config.bookingPerMinute;
}

function tooMany(windowStart: number, nowMs: number, windowMs: number): Response {
  const remainingMs = windowStart + windowMs - nowMs;
  const retryAfter = Math.max(1, Math.ceil(remainingMs / 1000));
  return new Response(
    JSON.stringify({
      error: 'rate-limited',
      message: 'Too many requests. Please retry shortly.',
    }),
    {
      status: 429,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'private, no-store',
        'retry-after': String(retryAfter),
      },
    },
  );
}

function isIpv4(value: string): boolean {
  const parts = value.split('.');
  if (parts.length !== 4) return false;
  for (const part of parts) {
    if (!/^[0-9]{1,3}$/u.test(part)) return false;
    if (part.length > 1 && part.startsWith('0')) return false;
    if (Number(part) > 255) return false;
  }
  return true;
}

function parseIpv6Groups(side: string): string[] | null {
  if (side.length === 0) return [];
  const groups = side.split(':');
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/u.test(group)) return null;
  }
  return groups;
}

function isIpv6(value: string): boolean {
  if (value.length < 2 || value.length > 39) return false;
  if (!/^[0-9a-f:]+$/u.test(value)) return false;
  const halves = value.split('::');
  if (halves.length > 2) return false;
  if (halves.length === 2) {
    const left = parseIpv6Groups(halves[0] ?? '');
    const right = parseIpv6Groups(halves[1] ?? '');
    if (!left || !right) return false;
    return left.length + right.length <= 7;
  }
  const groups = parseIpv6Groups(value);
  return groups !== null && groups.length === 8;
}

function normalizeAddress(raw: string): string | null {
  let value = raw.trim();
  if (value.length === 0 || value.length > 128) return null;
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).trim();
  if (value.startsWith('[')) {
    const end = value.indexOf(']');
    if (end < 2) return null;
    value = value.slice(1, end);
  } else if (value.includes('.') && value.includes(':')) {
    const port = value.lastIndexOf(':');
    const host = value.slice(0, port);
    const suffix = value.slice(port + 1);
    if (/^[0-9]+$/u.test(suffix) && isIpv4(host)) value = host;
  }
  const lower = value.toLowerCase();
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/u.exec(lower);
  if (mapped?.[1] && isIpv4(mapped[1])) return mapped[1];
  if (isIpv4(value)) return value;
  if (isIpv6(lower)) return lower;
  return null;
}

function validAddresses(header: string | null): string[] {
  if (!header) return [];
  const found: string[] = [];
  for (const part of header.split(',')) {
    const address = normalizeAddress(part);
    if (address) found.push(address);
  }
  return found;
}

function onlyValidAddress(header: string | null): string | null {
  if (!header || header.includes(',')) return null;
  return normalizeAddress(header);
}

function onPlatform(request: Request): boolean {
  const id = request.headers.get('x-vercel-id');
  return typeof id === 'string' && id.trim().length > 0;
}

/**
 * Address used as the throttle key.
 *
 * `x-vercel-id` means the platform accepted the request and overwrote the
 * forwarded-for headers. The first hop is the trusted hop:
 * `x-vercel-forwarded-for` when it is set, otherwise `x-forwarded-for`.
 * Do not copy those headers from the caller on any other host.
 *
 * `x-real-ip` must be one address. The dev server sets it from the socket.
 *
 * Without a platform request id, a multi-hop `x-forwarded-for` uses the last
 * hop, the address a receiver appended. A single untrusted value, or any value
 * that is not an IP address, shares the `unknown` bucket. Header text is never
 * stored as its own key.
 */
export function clientAddress(request: Request): string {
  if (onPlatform(request)) {
    const platformChain = validAddresses(request.headers.get('x-vercel-forwarded-for'));
    if (platformChain.length > 0) return platformChain[0] ?? UNKNOWN_ADDRESS;
    const forwarded = validAddresses(request.headers.get('x-forwarded-for'));
    if (forwarded.length > 0) return forwarded[0] ?? UNKNOWN_ADDRESS;
  }

  const real = onlyValidAddress(request.headers.get('x-real-ip'));
  if (real) return real;

  const forwarded = validAddresses(request.headers.get('x-forwarded-for'));
  if (forwarded.length > 1) return forwarded[forwarded.length - 1] ?? UNKNOWN_ADDRESS;
  return UNKNOWN_ADDRESS;
}

function dropOldest<T>(map: Map<string, T>, maxKeys: number): void {
  while (map.size > maxKeys) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
}

export function createConsultationThrottle(
  config: ConsultationRateConfig = consultationRateConfigFromEnv(),
): ConsultationThrottle {
  const buckets = new Map<string, Bucket>();
  const cache = new Map<string, CacheEntry>();
  const inflight = new Map<string, Promise<unknown>>();
  let lastSweep = 0;

  function sweep(nowMs: number, incomingKey: string | null): void {
    const windowElapsed = nowMs - lastSweep >= config.windowMs;
    const needsRoom =
      incomingKey !== null && !buckets.has(incomingKey) && buckets.size >= config.maxKeys;
    if (!windowElapsed && !needsRoom) return;
    lastSweep = nowMs;
    for (const [key, bucket] of buckets) {
      if (nowMs - bucket.windowStart >= config.windowMs) buckets.delete(key);
    }
    for (const [key, entry] of cache) {
      const stale =
        config.availabilityCacheMs <= 0 || nowMs - entry.storedAt >= config.availabilityCacheMs;
      if (stale) cache.delete(key);
    }
    if (incomingKey !== null && !buckets.has(incomingKey)) {
      dropOldest(buckets, config.maxKeys - 1);
    }
  }

  function remember(key: string, body: unknown, nowMs: number): void {
    if (config.availabilityCacheMs <= 0) return;
    cache.delete(key);
    dropOldest(cache, config.maxKeys - 1);
    cache.set(key, { body, storedAt: nowMs });
  }

  return {
    consume(request, path, nowMs) {
      const route = routeForPath(path);
      if (!route) return null;
      const address = clientAddress(request);
      const key = `${route}\n${address}`;
      sweep(nowMs, key);
      const windowStart = nowMs - (nowMs % config.windowMs);
      let bucket = buckets.get(key);
      if (!bucket || bucket.windowStart !== windowStart) {
        bucket = { windowStart, count: 0 };
      }
      bucket.count += 1;
      buckets.delete(key);
      buckets.set(key, bucket);
      if (bucket.count > limitFor(config, route)) {
        return tooMany(windowStart, nowMs, config.windowMs);
      }
      return null;
    },

    loadAvailability<T>(key: string, nowMs: number, load: () => Promise<T>): Promise<T> {
      sweep(nowMs, null);
      const hit = cache.get(key);
      if (hit && nowMs - hit.storedAt < config.availabilityCacheMs) {
        cache.delete(key);
        cache.set(key, hit);
        return Promise.resolve(hit.body as T);
      }
      if (hit) cache.delete(key);
      const pending = inflight.get(key);
      if (pending) return pending as Promise<T>;
      if (inflight.size >= config.maxKeys) {
        return load().then((body) => {
          remember(key, body, nowMs);
          return body;
        });
      }
      const work = load()
        .then((body) => {
          remember(key, body, nowMs);
          return body;
        })
        .finally(() => {
          if (inflight.get(key) === work) inflight.delete(key);
        });
      inflight.set(key, work);
      return work;
    },

    keyCount() {
      return buckets.size;
    },

    cacheCount() {
      return cache.size;
    },
  };
}
