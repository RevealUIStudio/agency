/**
 * Public studio offers for revealuistudio.com.
 *
 * Stranger-facing SKUs are locked: Working session, Architecture artifact
 * bundle and review, Launch package. Track D prices for the $3,500 bundle
 * and the launch package still import from `@revealui/contracts/pricing` so
 * those two numbers cannot drift from the shared menu. The $300 working
 * session is studio-only.
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
    'One hour on your system. That can be product, runtime, receipts, a stuck live flow, or launch prep. Remote, or in person in Maryville. You leave with notes and a next step.',
  includes: [
    'One focused hour',
    'Remote, or in person in Maryville',
    'Product, runtime, receipts, a stuck live flow, or launch prep',
    'Notes and a next step',
  ],
  notIncluded: ['A full rebuild', 'Ongoing support'],
  payment: 'Invoice $300 before we start. No holdback.',
} as const satisfies PublicOffer;

export const WRITTEN_PLAN = {
  id: 'written-plan',
  name: 'Architecture artifact bundle and review',
  price: WRITTEN_PLAN_PRICE,
  tagline: 'One bundle from the review',
  description:
    'The architecture artifact bundle and the review. The prototype is inside the artifact bundle. Not a live launch.',
  includes: [
    'The architecture artifact bundle and the review. The prototype is inside the artifact bundle',
    'Credit toward a later build if we start that build within 30 days',
  ],
  notIncluded: ['A live launch', 'Hosting or licenses'],
  payment: 'Half now, half on delivery. Credits to a launch in 30 days.',
} as const satisfies PublicOffer;

export const LAUNCH_PACKAGE = {
  id: 'launch-package',
  name: 'Launch package',
  price: PUBLIC_LAUNCH_PACKAGE_PRICE,
  tagline: 'One live flow on your accounts',
  description:
    'One live flow on your accounts. We scope it on the call and take it live. You own the result.',
  includes: [
    'One live flow on your accounts',
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
