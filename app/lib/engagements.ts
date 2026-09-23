/**
 * Public studio offers for revealuistudio.com.
 *
 * Stranger-facing SKUs are locked (2026-09-22): Consultation, Proof Sprint, Launch.
 * Proof Sprint is $3,997. Launch is $14,500. The previous middle offer and the
 * previous Launch list are retired. Architecture stays inside Launch.
 *
 * Launch price is a local override until @revealui/contracts publishes $14,500.
 * Care is an optional export and is not on the homepage trio.
 *
 * Fleet Stamp, Custom Build, and AI Integration stay in this file as
 * internal records (case-study shapes, future private use). They must not
 * be imported by homepage, nav, or pricing surfaces.
 */

/**
 * Monorepo counts for public proof points. Source: MARKETING_METRICS.md §1
 * in the revealui monorepo (claim-drift gate, last verified 2026-08-19).
 * Bump only after that SSOT moves.
 */
export const RUNTIME_METRICS = {
  // Pinned to revealui docs/MARKETING_METRICS.md §1 (claim-drift, 2026-08-19).
  packages: 32,
  mit: 25,
  fsl: 5,
} as const;

export type PublicOfferId = 'consultation' | 'proof-sprint' | 'launch-package';

export interface PublicOffer {
  readonly id: PublicOfferId;
  readonly name: string;
  /** Bare price string, e.g. "$300". */
  readonly price: string;
  readonly tagline: string;
  readonly description: string;
  readonly includes: readonly string[];
  readonly notIncluded: readonly string[];
  readonly payment: string;
}

export const CONSULTATION_PRICE = '$300' as const;
export const PROOF_SPRINT_PRICE = '$3,997' as const;

/**
 * TODO(offer-lock): import LAUNCH_PACKAGE_PRICE from `@revealui/contracts/pricing`
 * once that package publishes Launch $14,500 (studio offer lock 2026-09-22).
 * The installed contracts build still exports the retired $7,500 list.
 */
export const LAUNCH_PRICE = '$14,500' as const;

/** Stage B share host. Included with Proof Sprint and Launch. Not a homepage SKU. */
export const STAGE_B_PRICE = '$297' as const;

export const CARE_PRICE = '$1,997/mo' as const;

export const CONSULTATION = {
  id: 'consultation',
  name: 'Consultation',
  price: CONSULTATION_PRICE,
  tagline: 'Path A by default. A denser living pack.',
  description:
    'Path A is the default. Path B if you ask for it. You leave with a denser living pack and a Stage A share URL on your name at revealuistudio.com. Tax is $0. Remote, or in person.',
  includes: ['Path A by default', 'Path B if you ask', 'Denser living pack', 'Stage A share URL'],
  notIncluded: ['A free Proof Sprint', 'An unpaid build', 'An Architecture dump', 'Chatbot SaaS'],
  payment: 'Pay $300 per hour when you book the slot. Tax $0. No holdback.',
} as const satisfies PublicOffer;

export const PROOF_SPRINT = {
  id: 'proof-sprint',
  name: 'Proof Sprint',
  price: PROOF_SPRINT_PRICE,
  tagline: 'One site. One receipted action you operate.',
  description:
    'One site. One receipted action you operate. Stage B is included. Credits 100% to Launch if you start Launch within 45 days.',
  includes: [
    'One site',
    'One receipted action you operate',
    'Stage B included',
    '100% credit toward Launch within 45 days',
  ],
  notIncluded: ['A second site', 'Hosted chatbot SaaS', 'Product licenses'],
  payment:
    'Invoice $3,997 before we start. You keep the site if you walk. Credits 100% to Launch if you start Launch within 45 days.',
} as const satisfies PublicOffer;

export const LAUNCH = {
  id: 'launch-package',
  name: 'Launch',
  price: LAUNCH_PRICE,
  tagline: 'Architecture inside. Runbook. 30-day stabilization.',
  description:
    'One live flow on your accounts. Architecture work (schema, primitives, review) happens inside this offer, not as a named SKU. You get a runbook and 30 days of async stabilization. Knowledge Graph is part of the runtime (Electric+CRDT), not a fourth Studio offer. We scope it on the call and take it live. You own the result.',
  includes: [
    'One live flow on your accounts',
    'Architecture work inside this offer',
    'Runbook',
    '30-day async stabilization',
  ],
  notIncluded: ['Care, which is optional', 'A multi-month platform', 'An “AI” headline'],
  payment: 'Half now, half on delivery.',
} as const satisfies PublicOffer;

/** The only three offers strangers should see on the homepage. */
export const PUBLIC_OFFERS = [CONSULTATION, PROOF_SPRINT, LAUNCH] as const;

/**
 * Optional monthly care. Export is allowed. Do not add this to PUBLIC_OFFERS
 * or the stranger homepage trio.
 */
export const CARE = {
  id: 'care',
  name: 'Care',
  price: CARE_PRICE,
  optional: true,
  note: 'Optional monthly care. You can export and leave. Not required.',
} as const;

/**
 * Internal product lanes. Do not import from homepage, nav, or pricing.
 * Case-study types still reference these shapes.
 */
export const FLEET_STAMP = {
  id: 'fleet-stamp',
  name: 'Fleet Stamp',
  price: '$25,000',
  startsFrom: true,
} as const;

export const CUSTOM_BUILD = {
  id: 'custom-build',
  name: 'Custom Build',
  price: '$50,000',
  startsFrom: true,
} as const;

export const AI_INTEGRATION = {
  id: 'ai-integration',
  name: 'AI Integration',
  price: 'Fixed-bid',
  startsFrom: false,
} as const;
