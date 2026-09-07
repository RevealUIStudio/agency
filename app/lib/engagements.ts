/**
 * Public studio offers for revealuistudio.com.
 *
 * Stranger-facing SKUs are locked: Consultation, Pilot, Launch.
 * Launch still imports its price from `@revealui/contracts/pricing` so that
 * number cannot drift from the shared menu. Consultation and Pilot are
 * studio-only. Architecture work (schema, primitives, review) happens
 * inside Launch, not as a named SKU.
 *
 * Fleet Stamp, Custom Build, and AI Integration stay in this file as
 * internal records (case-study shapes, future private use). They must not
 * be imported by homepage, nav, or pricing surfaces.
 */

import { LAUNCH_PACKAGE_PRICE } from '@revealui/contracts/pricing';

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
export const WRITTEN_PLAN_PRICE = '$1,500' as const;
export const PUBLIC_LAUNCH_PACKAGE_PRICE = LAUNCH_PACKAGE_PRICE;

export const WORKING_SESSION = {
  id: 'working-session',
  name: 'Consultation',
  price: WORKING_SESSION_PRICE,
  tagline: 'Notes and a next step',
  description:
    'One focused session on your system. That can be product, runtime, receipts, a stuck live flow, or launch prep. Remote, or in person in Maryville. You leave with notes and a next step. No leftover site.',
  includes: [
    'Notes and a next step',
    'Remote, or in person in Maryville',
    'Product, runtime, receipts, a stuck live flow, or launch prep',
    'No leftover site',
  ],
  notIncluded: ['A leftover site', 'A full rebuild', 'Ongoing support'],
  payment: 'Invoice $300 before we start. No holdback.',
} as const satisfies PublicOffer;

export const WRITTEN_PLAN = {
  id: 'written-plan',
  name: 'Pilot',
  price: WRITTEN_PLAN_PRICE,
  tagline: 'One site you operate',
  description:
    'One site on your domain. One agent you operate on your Vercel, with your model key. Click-to-call plus book or quote. One receipted action. You keep it if you walk.',
  includes: [
    'One site on your domain',
    'One agent you operate (your Vercel, your model key)',
    'Click-to-call plus book or quote',
    'One receipted action',
    'You keep it if you walk',
  ],
  notIncluded: ['Hosted chatbot SaaS', 'A multi-site rollout', 'Product licenses'],
  payment:
    'Invoice $1,500 before we start. You keep the site if you walk. Credits 100% to Launch if we start Launch within 30 days.',
} as const satisfies PublicOffer;

export const LAUNCH_PACKAGE = {
  id: 'launch-package',
  name: 'Launch',
  price: PUBLIC_LAUNCH_PACKAGE_PRICE,
  tagline: 'One live flow on your accounts',
  description:
    'One live flow on your accounts. Architecture work (schema, primitives, review) happens inside this offer, not as a named SKU. We scope it on the call and take it live. You own the result.',
  includes: [
    'One live flow on your accounts',
    'Architecture work (schema, primitives, review) inside this offer',
    'Scope locked on the intro call',
    'Live handoff; you own what we ship',
  ],
  notIncluded: ['A multi-month platform', 'An “AI” headline', 'Unlimited revisions'],
  payment: 'Half now, half on delivery.',
} as const satisfies PublicOffer;

/** The only three offers strangers should see. */
export const PUBLIC_OFFERS = [WORKING_SESSION, WRITTEN_PLAN, LAUNCH_PACKAGE] as const;

/** @deprecated Use WRITTEN_PLAN. Public name is Pilot. */
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
