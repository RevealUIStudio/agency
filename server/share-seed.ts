/**
 * Stage A seed notes. Served only by the share handler when the host slug
 * matches the path slug. They are not files under `public/`.
 */
export const SHARE_SEED: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  omega: {
    'home.txt': `EXAMPLE
RevealUI Studio · Omega · Stage A
Circuit-R chrome. Client slug: omega.
Host: omega.revealuistudio.com
Route: /
This file is a placeholder. It is not a finished client pack.
Stage B is $297, or included with Proof Sprint and Launch.
Wildcard DNS is attached by the owner.
`,
    'walkthrough.txt': `EXAMPLE
RevealUI Studio · Omega · Stage A
Circuit-R chrome. Client slug: omega.
Host: omega.revealuistudio.com
Route: /walkthrough
This file is a placeholder. It is not a finished client pack.
Stage B is $297, or included with Proof Sprint and Launch.
Wildcard DNS is attached by the owner.
`,
    'pack.txt': `EXAMPLE
RevealUI Studio · Omega · Stage A
Circuit-R chrome. Client slug: omega.
Host: omega.revealuistudio.com
Route: /pack
This file is a placeholder. It is not a finished client pack.
Stage B is $297, or included with Proof Sprint and Launch.
Wildcard DNS is attached by the owner.
`,
    'onboarding.txt': `EXAMPLE
RevealUI Studio · Omega · Stage A
Circuit-R chrome. Client slug: omega.
Host: omega.revealuistudio.com
Route: /onboarding
This file is a placeholder. It is not a finished client pack.
Stage B is $297, or included with Proof Sprint and Launch.
Wildcard DNS is attached by the owner.
`,
    'demo.txt': `EXAMPLE
RevealUI Studio · Omega · Stage A
Circuit-R chrome. Client slug: omega.
Host: omega.revealuistudio.com
Route: /demo
This file is a placeholder. It is not a finished client pack.
Stage B is $297, or included with Proof Sprint and Launch.
Wildcard DNS is attached by the owner.
`,
  },
};

export const SHARE_SEED_FILES = [
  'home.txt',
  'walkthrough.txt',
  'pack.txt',
  'onboarding.txt',
  'demo.txt',
] as const;

export type ShareSeedFile = (typeof SHARE_SEED_FILES)[number];

export function readShareSeed(slug: string, file: string): string | null {
  const tenant = SHARE_SEED[slug];
  if (!tenant) return null;
  const body = tenant[file];
  return body ?? null;
}
