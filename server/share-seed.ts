/**
 * Stage A seed notes. Served only by the share handler when the host slug
 * matches the path slug. They are not files under `public/`.
 */

import { STAGE_B_ADDON, STAGE_B_DETAIL } from '../app/lib/consultation-buyer';
import { DOMAIN_PACK_PAGES, type DomainPackPageId, domainPackLines } from '../app/lib/domain-pack';
import { STAGE_B_PRICE } from '../app/lib/engagements';

function exampleNote(route: string, lines: readonly string[]): string {
  return [
    'EXAMPLE',
    'RevealUI Studio · Omega · Stage A',
    'Circuit-R chrome. Client slug: omega.',
    'Host: omega.revealuistudio.com',
    `Route: ${route}`,
    ...lines,
    '',
  ].join('\n');
}

function domainPackNote(id: DomainPackPageId, route: string): string {
  return exampleNote(route, domainPackLines(id, 'omega'));
}

const domainPackFiles = Object.fromEntries(
  DOMAIN_PACK_PAGES.map((page) => [page.file, domainPackNote(page.id, page.path)]),
);

export const SHARE_SEED: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  omega: {
    'home.txt': exampleNote('/', [
      'Stage A shell for omega.revealuistudio.com.',
      `${STAGE_B_ADDON} ${STAGE_B_DETAIL}`,
      `The domain pack is ${STAGE_B_PRICE} on its own, or included with Proof Sprint and Launch.`,
      'The studio attaches the DNS.',
    ]),
    ...domainPackFiles,
    'pack.txt': exampleNote('/pack', [
      'Denser living pack for omega. The consultation leaves this pack on the studio host.',
    ]),
    'demo.txt': exampleNote('/demo', [
      'Demo slot for omega. Example only. The domain pack does not sell a demo.',
    ]),
  },
};

export const SHARE_SEED_FILES = [
  'home.txt',
  'dns.txt',
  'path.txt',
  'proof-gap.txt',
  'stack.txt',
  'onboarding.txt',
  'walkthrough.txt',
  'pack.txt',
  'demo.txt',
] as const;

export type ShareSeedFile = (typeof SHARE_SEED_FILES)[number];

export function readShareSeed(slug: string, file: string): string | null {
  const tenant = SHARE_SEED[slug];
  if (!tenant) return null;
  const body = tenant[file];
  return body ?? null;
}
