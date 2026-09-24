/**
 * Buyer-facing domain pack. The Stripe SKU stays `stage-b`.
 * Public book copy must not say free, included, waived, or credited.
 */

import { CUSTOM_DOMAIN_CNAME_TARGET } from './share-stage-b';

export const DOMAIN_PACK_LIST_LABEL = 'Domain pack' as const;
export const DOMAIN_PACK_CREDIT_LABEL = 'Domain pack credit' as const;
export const DOMAIN_PACK_DUE_LABEL = 'Domain pack due' as const;

export const DOMAIN_PACK_PAGES = [
  { id: 'dns', path: '/dns', file: 'dns.txt', title: 'DNS card' },
  { id: 'path', path: '/path', file: 'path.txt', title: 'Path note' },
  { id: 'proof-gap', path: '/proof-gap', file: 'proof-gap.txt', title: 'Proof-gap map' },
  { id: 'stack', path: '/stack', file: 'stack.txt', title: 'Stack sketch' },
  { id: 'onboarding', path: '/onboarding', file: 'onboarding.txt', title: 'Onboarding' },
  { id: 'walkthrough', path: '/walkthrough', file: 'walkthrough.txt', title: 'Walkthrough' },
] as const;

export type DomainPackPageId = (typeof DOMAIN_PACK_PAGES)[number]['id'];

export const SHARE_NAV = [
  { href: '/', label: 'Home' },
  { href: '/dns', label: 'DNS card' },
  { href: '/path', label: 'Path note' },
  { href: '/proof-gap', label: 'Proof-gap map' },
  { href: '/stack', label: 'Stack sketch' },
  { href: '/onboarding', label: 'Onboarding' },
  { href: '/walkthrough', label: 'Walkthrough' },
  { href: '/pack', label: 'Pack' },
  { href: '/demo', label: 'Demo' },
] as const;

export function domainPackLines(id: DomainPackPageId, slug: string): readonly string[] {
  switch (id) {
    case 'dns':
      return [
        `Studio host: ${slug}.revealuistudio.com`,
        'Custom domain: a hostname you already own.',
        `CNAME target: ${CUSTOM_DOMAIN_CNAME_TARGET}`,
        'TXT token: revealui-site-verification= and that hostname.',
        'Chrome: studio, co-brand, or white label.',
        'The studio attaches the DNS.',
      ];
    case 'path':
      return [
        'Path A is the default for this consultation.',
        'Path B is the alternate, written here when you ask for it on the call.',
        'This page is the path note for the domain pack.',
      ];
    case 'proof-gap':
      return [
        'This page is the proof-gap map from the consultation.',
        'It records the checks that were No or Partial, and the one gap to fix first.',
      ];
    case 'stack':
      return [
        'This page is a lightweight sketch of the stack you described.',
        'It names the accounts, the model key, and how the work happens today.',
        'Architecture, schema, and review stay inside Launch.',
      ];
    case 'onboarding':
      return [
        'This page tells the next person what the share is.',
        'Open the path note, the proof-gap map, and the stack sketch.',
        `The studio host stays ${slug}.revealuistudio.com until the custom domain is live.`,
      ];
    case 'walkthrough':
      return [
        'This page is one written walk of the path from the consultation.',
        'Follow it in order. It covers that one path.',
      ];
  }
}
