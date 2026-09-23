export type Session = { readonly role: 'guest' } | { readonly role: 'owner' };

export interface SessionEnv {
  readonly ownerSession?: string;
}

function tokenMatches(presented: string, expected: string): boolean {
  const a = new TextEncoder().encode(presented);
  const b = new TextEncoder().encode(expected);
  const len = Math.max(a.length, b.length, 1);
  let mismatch = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i += 1) {
    mismatch |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return mismatch === 0;
}

/**
 * Owner is a server-held bearer token (`STUDIO_OWNER_SESSION`).
 * Query params, a JSON `role` field, and a missing token are guests.
 * An empty expected token never matches (fail closed).
 */
export function verifySession(request: Request, env: SessionEnv): Session {
  const expected = env.ownerSession ?? '';
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  const presented = match?.[1] ?? '';
  if (!expected || !presented) return { role: 'guest' };
  if (!tokenMatches(presented, expected)) return { role: 'guest' };
  return { role: 'owner' };
}
