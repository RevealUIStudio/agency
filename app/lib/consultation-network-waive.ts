/**
 * Owner-signed Consultation book links.
 *
 * A valid token forces the domain pack onto the Checkout Session and marks
 * the fee waived_network. The client cannot set that fee by itself.
 * The signing secret stays in CONSULTATION_NETWORK_WAIVE_SECRET.
 */

export const NETWORK_LINK_TTL_HOURS_DEFAULT = 72;
export const NETWORK_LINK_TTL_HOURS_MAX = 24 * 14;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const JTI_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;
const TOKEN_MAX_LENGTH = 4096;

export interface NetworkWaiveClaims {
  readonly v: 1;
  readonly stage_b_fee: 'waived_network';
  readonly exp: number;
  readonly jti: string;
  readonly email?: string;
}

export interface NetworkLinkRequest {
  readonly email?: string;
  readonly hours?: number;
  readonly ttlSeconds: number;
}

export class NetworkWaiveUnconfigured extends Error {
  constructor() {
    super('network-waive-unconfigured');
    this.name = 'NetworkWaiveUnconfigured';
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return null;
  const padded =
    value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  const length = Math.max(left.length, right.length);
  let diff = left.length === right.length ? 0 : 1;
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

function claimsJson(claims: NetworkWaiveClaims): string {
  const body: Record<string, string | number> = {
    v: claims.v,
    stage_b_fee: claims.stage_b_fee,
    exp: claims.exp,
    jti: claims.jti,
  };
  if (claims.email) body.email = claims.email;
  return JSON.stringify(body);
}

function parseClaims(json: string): NetworkWaiveClaims | null {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return null;
  }
  const record = asRecord(value);
  if (!record) return null;
  if (record.v !== 1 || record.stage_b_fee !== 'waived_network') return null;
  if (typeof record.exp !== 'number' || !Number.isInteger(record.exp)) return null;
  if (typeof record.jti !== 'string' || !JTI_PATTERN.test(record.jti)) return null;
  let email: string | undefined;
  if (record.email !== undefined) {
    if (typeof record.email !== 'string') return null;
    const normalized = record.email.trim().toLowerCase();
    if (normalized.length > 200 || !EMAIL_PATTERN.test(normalized)) return null;
    email = normalized;
  }
  return {
    v: 1,
    stage_b_fee: 'waived_network',
    exp: record.exp,
    jti: record.jti,
    ...(email ? { email } : {}),
  };
}

async function signJson(secret: string, json: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(json));
  return new Uint8Array(mac);
}

export function normalizeNetworkEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (email.length === 0 || email.length > 200 || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

export function networkEmailMatches(claims: NetworkWaiveClaims, email: string): boolean {
  if (!claims.email) return true;
  return claims.email === email.trim().toLowerCase();
}

/** Mask for the book page. The full address stays inside the signed token. */
export function networkEmailHint(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '';
  return `${email.slice(0, 1)}***@${email.slice(at + 1)}`;
}

export function networkBookPath(token: string, hours?: number): string {
  const params = new URLSearchParams();
  params.set('nw', token);
  if (hours !== undefined) params.set('hours', String(hours));
  return `/consultation/book?${params.toString()}`;
}

export function parseNetworkLinkBody(raw: unknown): NetworkLinkRequest | null {
  const body = asRecord(raw);
  if (!body) return null;

  let email: string | undefined;
  if (body.email !== undefined && body.email !== null && body.email !== '') {
    if (typeof body.email !== 'string') return null;
    const normalized = normalizeNetworkEmail(body.email);
    if (!normalized) return null;
    email = normalized;
  }

  let hours: number | undefined;
  if (body.hours !== undefined && body.hours !== null) {
    if (typeof body.hours !== 'number' || !Number.isInteger(body.hours)) return null;
    if (body.hours < 1 || body.hours > 8) return null;
    hours = body.hours;
  }

  let ttlHours = NETWORK_LINK_TTL_HOURS_DEFAULT;
  if (body.ttl_hours !== undefined && body.ttl_hours !== null) {
    if (typeof body.ttl_hours !== 'number' || !Number.isInteger(body.ttl_hours)) return null;
    if (body.ttl_hours < 1 || body.ttl_hours > NETWORK_LINK_TTL_HOURS_MAX) return null;
    ttlHours = body.ttl_hours;
  }

  return {
    ...(email ? { email } : {}),
    ...(hours !== undefined ? { hours } : {}),
    ttlSeconds: ttlHours * 60 * 60,
  };
}

export async function mintNetworkToken(input: {
  readonly secret: string;
  readonly now: Date;
  readonly ttlSeconds?: number;
  readonly email?: string;
  readonly jti?: string;
}): Promise<{ readonly token: string; readonly claims: NetworkWaiveClaims }> {
  const secret = input.secret.trim();
  if (!secret) throw new NetworkWaiveUnconfigured();
  const email = input.email ? normalizeNetworkEmail(input.email) : undefined;
  if (input.email && !email) throw new Error('network-email');
  const ttlSeconds = input.ttlSeconds ?? NETWORK_LINK_TTL_HOURS_DEFAULT * 60 * 60;
  const claims: NetworkWaiveClaims = {
    v: 1,
    stage_b_fee: 'waived_network',
    exp: Math.floor(input.now.getTime() / 1000) + ttlSeconds,
    jti: input.jti ?? crypto.randomUUID(),
    ...(email ? { email } : {}),
  };
  const json = claimsJson(claims);
  const signature = await signJson(secret, json);
  const token = `${bytesToBase64Url(new TextEncoder().encode(json))}.${bytesToBase64Url(signature)}`;
  return { token, claims };
}

export async function verifyNetworkToken(input: {
  readonly secret: string;
  readonly token: string;
  readonly now: Date;
}): Promise<NetworkWaiveClaims | null> {
  const secret = input.secret.trim();
  const token = input.token.trim();
  if (!secret || !token || token.length > TOKEN_MAX_LENGTH) return null;
  const dot = token.indexOf('.');
  if (dot <= 0 || token.indexOf('.', dot + 1) !== -1) return null;
  const payload = base64UrlToBytes(token.slice(0, dot));
  const signature = base64UrlToBytes(token.slice(dot + 1));
  if (!payload || !signature) return null;
  const json = new TextDecoder().decode(payload);
  const expected = await signJson(secret, json);
  if (!timingSafeEqual(signature, expected)) return null;
  const claims = parseClaims(json);
  if (!claims) return null;
  if (claims.exp <= Math.floor(input.now.getTime() / 1000)) return null;
  return claims;
}
