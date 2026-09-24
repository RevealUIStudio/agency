/**
 * Mint a signed Consultation book link.
 *
 * Reads CONSULTATION_NETWORK_WAIVE_SECRET and PUBLIC_SITE_URL.
 * Does not print the secret.
 *
 *   pnpm consultation:mint-network-link
 *   pnpm consultation:mint-network-link -- --email ada@example.com --hours 1 --ttl-hours 72
 */
import {
  mintNetworkToken,
  networkBookPath,
  parseNetworkLinkBody,
} from '../app/lib/consultation-network-waive.ts';

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) return undefined;
  return value;
}

const secret = process.env.CONSULTATION_NETWORK_WAIVE_SECRET?.trim() ?? '';
if (!secret) {
  console.error('CONSULTATION_NETWORK_WAIVE_SECRET is unset');
  process.exit(1);
}

const hoursFlag = flag('hours');
const ttlFlag = flag('ttl-hours');
const emailFlag = flag('email');
const parsed = parseNetworkLinkBody({
  ...(emailFlag ? { email: emailFlag } : {}),
  ...(hoursFlag ? { hours: Number(hoursFlag) } : {}),
  ...(ttlFlag ? { ttl_hours: Number(ttlFlag) } : {}),
});
if (!parsed) {
  console.error('invalid email, hours, or ttl-hours');
  process.exit(1);
}

const origin = (process.env.PUBLIC_SITE_URL ?? 'https://revealuistudio.com').replace(/\/+$/u, '');
const minted = await mintNetworkToken({
  secret,
  now: new Date(),
  ttlSeconds: parsed.ttlSeconds,
  email: parsed.email,
});
console.log(
  JSON.stringify({
    url: `${origin}${networkBookPath(minted.token, parsed.hours)}`,
    expires_at: new Date(minted.claims.exp * 1000).toISOString(),
  }),
);
