/**
 * Stage B pack fields on top of the Stage A `{slug}.revealuistudio.com` host.
 * Comparisons use caller-supplied CNAME and TXT observations. This module does
 * not query DNS, call Vercel, or edit registrar records.
 */

import { clientSlugFromHost, STUDIO_APEX_HOST } from '@/lib/share-host';

export const CUSTOM_DOMAIN_CNAME_TARGET = 'cname.vercel-dns.com' as const;

export const CHROME_LEVELS = ['studio', 'co-brand', 'white_label'] as const;
export type ChromeLevel = (typeof CHROME_LEVELS)[number];

export const CUSTOM_DOMAIN_STATUSES = ['none', 'pending_dns', 'live'] as const;
export type CustomDomainStatus = (typeof CUSTOM_DOMAIN_STATUSES)[number];

export interface SharePack {
  /** Content id. Studio host and a live custom domain resolve to this same id. */
  readonly id: string;
  /** Stage A label. The share shell and seed stay keyed by this slug. */
  readonly slug: string;
  readonly customDomain: string | null;
  readonly chromeLevel: ChromeLevel;
  readonly customDomainStatus: CustomDomainStatus;
}

export interface ObservedDns {
  readonly cname: string;
  readonly txt: string;
}

export interface ShareViewer {
  readonly packId: string;
  readonly slug: string;
}

export interface ShareChrome {
  readonly level: ChromeLevel;
  readonly showStudioMark: boolean;
  readonly showStudioName: boolean;
  readonly subtitle: string;
}

const packsById = new Map<string, SharePack>();

const FQDN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function normalizeHostname(hostname: string): string {
  const head = hostname.trim().toLowerCase().replace(/\.$/, '').split(':')[0];
  return head ?? '';
}

export function createSharePack(slug: string, patch?: Partial<Omit<SharePack, 'slug'>>): SharePack {
  return {
    id: patch?.id ?? slug,
    slug,
    customDomain: patch?.customDomain ?? null,
    chromeLevel: patch?.chromeLevel ?? 'studio',
    customDomainStatus: patch?.customDomainStatus ?? 'none',
  };
}

export function listSharePacks(): readonly SharePack[] {
  return [...packsById.values()];
}

export function saveSharePack(pack: SharePack): void {
  packsById.set(pack.id, pack);
}

export function clearSharePacks(): void {
  packsById.clear();
}

/** Public TXT value the admin publishes. Deterministic so the desk can show it. */
export function customDomainTxtToken(fqdn: string): string {
  return `revealui-site-verification=${fqdn}`;
}

export function parseCustomDomain(raw: string): string | null {
  const host = normalizeHostname(raw);
  if (!host || !FQDN_PATTERN.test(host)) return null;
  if (host === STUDIO_APEX_HOST || host.endsWith(`.${STUDIO_APEX_HOST}`)) return null;
  if (host === 'localhost' || host.endsWith('.localhost')) return null;
  return host;
}

export function withCustomDomain(pack: SharePack, raw: string): SharePack {
  const customDomain = parseCustomDomain(raw);
  if (!customDomain) {
    return { ...pack, customDomain: null, customDomainStatus: 'none' };
  }
  if (pack.customDomain === customDomain) return pack;
  return { ...pack, customDomain, customDomainStatus: 'pending_dns' };
}

function txtMatches(observed: string, expected: string): boolean {
  return observed.split(/\r?\n/).some((line) => {
    let value = line.trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) value = value.slice(1, -1).trim();
    return value === expected;
  });
}

/** Live only when the supplied observations match the expected target and token. */
export function verifyCustomDomain(pack: SharePack, observed: ObservedDns): SharePack {
  if (!pack.customDomain) {
    return { ...pack, customDomainStatus: 'none' };
  }
  const cname = normalizeHostname(observed.cname);
  const txtOk = txtMatches(observed.txt, customDomainTxtToken(pack.customDomain));
  const live = cname === CUSTOM_DOMAIN_CNAME_TARGET && txtOk;
  return { ...pack, customDomainStatus: live ? 'live' : 'pending_dns' };
}

export function resolveShareViewer(
  hostname: string,
  packs: readonly SharePack[],
): ShareViewer | null {
  const stageSlug = clientSlugFromHost(hostname);
  if (stageSlug) {
    const pack = packs.find((item) => item.slug === stageSlug);
    return { packId: pack?.id ?? stageSlug, slug: stageSlug };
  }
  const host = normalizeHostname(hostname);
  if (!host) return null;
  const pack = packs.find((item) => {
    if (!item.customDomain || item.customDomainStatus !== 'live') return false;
    return normalizeHostname(item.customDomain) === host;
  });
  if (!pack) return null;
  return { packId: pack.id, slug: pack.slug };
}

export function resolveSharePackId(hostname: string, packs: readonly SharePack[]): string | null {
  return resolveShareViewer(hostname, packs)?.packId ?? null;
}

function titleCaseSlug(slug: string): string {
  return slug
    .split('-')
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export function shareChrome(slug: string, level: ChromeLevel = 'studio'): ShareChrome {
  const label = titleCaseSlug(slug);
  if (level === 'co-brand') {
    return {
      level,
      showStudioMark: true,
      showStudioName: true,
      subtitle: `${label} · Co-brand`,
    };
  }
  if (level === 'white_label') {
    return {
      level,
      showStudioMark: false,
      showStudioName: false,
      subtitle: label,
    };
  }
  return {
    level: 'studio',
    showStudioMark: true,
    showStudioName: true,
    subtitle: `${label} · Stage A · ${slug}.revealuistudio.com`,
  };
}
