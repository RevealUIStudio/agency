/**
 * Public studio offers for revealuistudio.com.
 *
 * Stranger-facing SKUs are locked: Working session, Written plan, Launch
 * package. Track D prices for the written plan and launch package still
 * import from `@revealui/contracts/pricing` so those two numbers cannot
 * drift from the shared menu. The $300 working session is studio-only.
 *
 * Fleet Stamp, Custom Build, and AI Integration stay in this file as
 * internal records (case-study shapes, future private use). They must not
 * be imported by homepage, nav, or pricing surfaces.
 */

import { ARCHITECTURE_REVIEW_PRICE, LAUNCH_PACKAGE_PRICE } from '@revealui/contracts/pricing';

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

export type PublicOfferId = 'working-session' | 'written-plan' | 'launch-package';

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

export const WORKING_SESSION_PRICE = '$300' as const;
export const WRITTEN_PLAN_PRICE = ARCHITECTURE_REVIEW_PRICE;
export const PUBLIC_LAUNCH_PACKAGE_PRICE = LAUNCH_PACKAGE_PRICE;

export const WORKING_SESSION = {
  id: 'working-session',
  name: 'Working session',
  price: WORKING_SESSION_PRICE,
  tagline: 'One focused hour',
  description:
    'One hour on your site, booking, forms, or “call us” flow. In person in Maryville, Alcoa, or Knoxville, or on a call. You leave with notes and a next step.',
  includes: [
    'One focused hour',
    'In person in Maryville, Alcoa, or Knoxville, or on a call',
    'Site, booking, forms, or “call us” flow',
    'Notes and a next step',
  ],
  notIncluded: ['A full rebuild', 'Ongoing support'],
  payment: 'Invoice $300 before we start. No holdback.',
} as const satisfies PublicOffer;

export const WRITTEN_PLAN = {
  id: 'written-plan',
  name: 'Written plan',
  price: WRITTEN_PLAN_PRICE,
  tagline: 'Scoped review, no code',
  description:
    'A written plan for a business whose systems do not talk to each other. The aim is booking, billing, and client work on one system you own.',
  includes: [
    'Scoped written review of how the work should fit together',
    'One system you own: booking, billing, and client work',
    'Credit toward a later build if we start that build within 30 days',
  ],
  notIncluded: ['Code', 'Hosting or licenses'],
  payment: 'Half now, half on delivery. Credits to a launch in 30 days.',
} as const satisfies PublicOffer;

export const LAUNCH_PACKAGE = {
  id: 'launch-package',
  name: 'Launch package',
  price: PUBLIC_LAUNCH_PACKAGE_PRICE,
  tagline: 'One site or booking flow, live',
  description:
    'One site or booking / “call us” flow. We scope it on the call and take it live. You own the result.',
  includes: [
    'One site, or one booking / “call us” flow',
    'Scope locked on the intro call',
    'Live handoff; you own what we ship',
  ],
  notIncluded: ['A multi-month platform', 'An “AI” headline', 'Unlimited revisions'],
  payment:
    'Half now, half when the four tests pass (your infra, your Stripe checkout, signup-to-paid, one receipted agent action). If we miss, we keep working or you get the first half back and keep the stack.',
} as const satisfies PublicOffer;

/** The only three offers strangers should see. */
export const PUBLIC_OFFERS = [WORKING_SESSION, WRITTEN_PLAN, LAUNCH_PACKAGE] as const;

/** @deprecated Use WRITTEN_PLAN. Price is unchanged. */
export const ARCHITECTURE_REVIEW = {
  id: 'written-plan',
  name: WRITTEN_PLAN.name,
  price: WRITTEN_PLAN.price,
  startsFrom: false,
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
