/**
 * Public studio offers for revealuistudio.com.
 *
 * Stranger-facing ladder (2026-09-26): Consultation, Pilot, Launch.
 * Pilot is $3,997 and includes 1 Adapter. Launch is the published contracts
 * list and includes up to 3 Adapters. Proof Sprint is retired as the public
 * middle name. Architecture stays inside Launch.
 *
 * Adapter is a public add-on at $2,497 (one tool category per unit). It is
 * not a fourth homepage card and is not sold alone.
 *
 * Care is an optional export and is not on the homepage trio. A scoped
 * Adapter can attach while the buyer is on Care.
 *
 * Fleet Stamp, Custom Build, and AI Integration stay in this file as
 * internal records (case-study shapes, future private use). They must not
 * be imported by homepage, nav, or pricing surfaces.
 */

import { LAUNCH_PACKAGE_PRICE } from '@revealui/contracts/pricing';

/**
 * Monorepo counts for public proof points. Source: MARKETING_METRICS.md §1
 * in the revealui monorepo (cross-checked against package manifests 2026-09-29).
 * Bump only after that SSOT moves.
 */
export const RUNTIME_METRICS = {
  // Pinned to revealui docs/MARKETING_METRICS.md §1 (verified 2026-09-29).
  packages: 33,
  mit: 26,
  fsl: 5,
} as const;

export type PublicOfferId = 'consultation' | 'pilot' | 'launch-package';

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
/** Advertised session scope. A share URL or domain pack is not part of this promise. */
export const CONSULTATION_DELIVERABLE = 'Session notes and a recommended next step.' as const;
export const PILOT_PRICE = '$3,997' as const;

/** Published Launch list from `@revealui/contracts/pricing` (0.12.0 is $14,500). */
export const LAUNCH_PRICE = LAUNCH_PACKAGE_PRICE;

/** Domain pack. $297 after Consultation alone. Included at Pilot and Launch. Not a homepage SKU. SKU id stays stage-b. */
export const STAGE_B_PRICE = '$297' as const;

export const CARE_PRICE = '$1,997/mo' as const;

/** One tool category. Extras, or a scoped Adapter while on Care. Not sold alone. */
export const ADAPTER_PRICE = '$2,497' as const;
export const ADAPTER_CENTS = 249_700 as const;
export const ADAPTER_INCLUDED_ON_PILOT = 1 as const;
export const ADAPTER_INCLUDED_ON_LAUNCH = 3 as const;

/** Categorical tool names only. No vendor or competitor company brands. */
export const ADAPTER_CATEGORIES =
  'field-service CRM / estimating / dispatch, gallery / proofing, shopping cart, phone / SMS, calendar, payments / wallets, or labs / fulfillment' as const;

export const CONSULTATION = {
  id: 'consultation',
  name: 'Consultation',
  price: CONSULTATION_PRICE,
  tagline: 'Get a clear next step.',
  description: `Bring the system you want to review and the question you need answered. We will work through it in a focused session. ${CONSULTATION_DELIVERABLE}`,
  includes: ['A focused review of your system', CONSULTATION_DELIVERABLE],
  notIncluded: [
    'A free Pilot',
    'An Adapter sold alone',
    'An unpaid build',
    'An Architecture dump',
    'Chatbot SaaS',
  ],
  payment: 'Pay $300 per hour when you book the slot. Tax $0. No holdback.',
} as const satisfies PublicOffer;

export const PILOT = {
  id: 'pilot',
  name: 'Pilot',
  price: PILOT_PRICE,
  tagline: 'One site. One receipted action you operate.',
  description:
    'One site. One receipted action you operate. Includes 1 Adapter (one tool category). The domain pack is included. Credits 100% to Launch if you start Launch within 45 days.',
  includes: [
    'One site',
    'One receipted action you operate',
    '1 Adapter (one tool category)',
    'Domain pack included',
    '100% credit toward Launch within 45 days',
  ],
  notIncluded: [
    'A second site',
    'A second Adapter at list price',
    'Hosted chatbot SaaS',
    'Product licenses',
  ],
  payment:
    'Invoice $3,997 before we start. You keep the site if you walk. Credits 100% to Launch if you start Launch within 45 days.',
} as const satisfies PublicOffer;

export const LAUNCH = {
  id: 'launch-package',
  name: 'Launch',
  price: LAUNCH_PRICE,
  tagline: 'Put one business flow into production.',
  description:
    'I design and implement one agreed business flow on your accounts. Includes up to 3 Adapters (one tool category each). Architecture work happens inside this offer. The domain pack is included. You receive a runbook and 30 days of async stabilization.',
  includes: [
    'One live flow on your accounts',
    'Up to 3 Adapters (one tool category each)',
    'Architecture work inside this offer',
    'Domain pack included',
    'Runbook',
    '30-day async stabilization',
  ],
  notIncluded: [
    `Care (${CARE_PRICE}), which is optional`,
    'A fourth Adapter at list price',
    'A multi-month platform',
    'An “AI” headline',
  ],
  payment: 'Half now, half on delivery.',
} as const satisfies PublicOffer;

/** The only three offers strangers should see on the homepage cards. */
export const PUBLIC_OFFERS = [CONSULTATION, PILOT, LAUNCH] as const;

/**
 * Public add-on. Not in PUBLIC_OFFERS. Pilot includes 1. Launch includes up to 3.
 * $2,497 buys an extra, or a scoped Adapter while on Care ($1,997/mo). Refuse Adapter-only.
 */
export const ADAPTER_CARE_HELP =
  `Scoped Adapter while on Care (${CARE_PRICE}). ${ADAPTER_PRICE}. One tool category.` as const;

/** Preferred calculator label. One tool category, one custom integration. */
export const ADAPTER_CALC_LABEL = 'Adapter: one tool category, one custom integration' as const;

export const ADAPTER = {
  id: 'adapter',
  name: 'Adapter',
  price: ADAPTER_PRICE,
  tagline: 'How the leak fix sticks. One tool category.',
  description: `One custom integration to one tool category (${ADAPTER_CATEGORIES}). Governed read/write where scoped, the agent can act on it, a receipt proves the action, and a short runbook. Pilot includes 1. Launch includes up to 3. List price is for extras. ${ADAPTER_CARE_HELP} Not sold alone.`,
} as const;

/** Pilot and Launch are the leak fix. Adapter is how one tool category stays on it. */
export const ADAPTER_ROLE =
  'Pilot and Launch fix the leak on the lead desk: find, pay, and deliver. An Adapter is how that fix stays on one tool category. It is not sold alone.' as const;

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
