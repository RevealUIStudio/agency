/**
 * Stage A share hosts: `{client}.revealuistudio.com` on the same Vercel project.
 * Apex and www stay the public studio site. Other hosts (localhost, preview
 * URLs) stay the studio site so this SPA still reviews before wildcard DNS.
 * `*.localhost` is the local seed (omega.localhost).
 *
 * OWNER attaches `*.revealuistudio.com` on Vercel and the registrar CNAME.
 * This module does not provision DNS.
 */

export const STUDIO_APEX_HOST = 'revealuistudio.com';

export const RESERVED_SHARE_LABELS = [
  'www',
  'mail',
  'ftp',
  'api',
  'admin',
  'app',
  'docs',
  'status',
  'share',
  'go',
  'studio',
  'founder',
  'billing',
  'desk',
] as const;

export const SHARE_SEED_SLUG = 'omega' as const;

export const SHARE_PATHS = ['/', '/walkthrough', '/pack', '/onboarding', '/demo'] as const;

export type SharePath = (typeof SHARE_PATHS)[number];

const SHARE_PARENTS = ['.revealuistudio.com', '.localhost'] as const;

function firstLabel(host: string, parent: (typeof SHARE_PARENTS)[number]): string | null {
  if (!host.endsWith(parent)) return null;
  const head = host.slice(0, -parent.length);
  if (!head || head.includes('.')) {
    // Nested names still use the left-most label (`omega.preview.revealuistudio.com`).
    const label = head.split('.')[0] ?? '';
    return label || null;
  }
  return head;
}

/** Client slug for a share host, or null when this request is the public studio site. */
export function clientSlugFromHost(hostname: string): string | null {
  const host = hostname.trim().toLowerCase().replace(/\.$/, '').split(':')[0] ?? '';
  if (!host || host === STUDIO_APEX_HOST || host === `www.${STUDIO_APEX_HOST}`) return null;

  let slug: string | null = null;
  for (const parent of SHARE_PARENTS) {
    slug = firstLabel(host, parent);
    if (slug) break;
  }
  if (!slug) return null;
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) return null;
  if ((RESERVED_SHARE_LABELS as readonly string[]).includes(slug)) return null;
  return slug;
}

export function isShareSeed(slug: string): boolean {
  return slug === SHARE_SEED_SLUG;
}
