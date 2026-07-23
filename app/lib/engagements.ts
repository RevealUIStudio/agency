/**
 * Agency engagement ladder + runtime metrics SSOT for revealuistudio.com.
 *
 * Shared Track D prices import from `@revealui/contracts/pricing` so agency
 * cannot drift from the self-serve FOUNDER_SERVICE_OFFERINGS menu on
 * revealui.com. Agency-only anchors (Fleet Stamp, Custom Build) and the
 * Studio-only AI Integration lane live here.
 *
 * Metrics match `docs/MARKETING_METRICS.md` §1 in the revealui monorepo
 * (claim-drift gate, last verified 2026-07-22). Bump only after that SSOT moves.
 */

import { ARCHITECTURE_REVIEW_PRICE, LAUNCH_PACKAGE_PRICE } from '@revealui/contracts/pricing';

/** Monorepo counts for public proof points. Source: MARKETING_METRICS.md §1. */
export const RUNTIME_METRICS = {
  packages: 29,
  mit: 23,
  fsl: 5,
} as const;

export type EngagementId =
  | 'architecture-review'
  | 'launch-package'
  | 'fleet-stamp'
  | 'custom-build'
  | 'ai-integration';

export interface EngagementRung {
  readonly id: EngagementId;
  readonly name: string;
  /** Bare price string, e.g. "$3,500" or "$25,000". */
  readonly price: string;
  /** When true, render as "from $X". */
  readonly startsFrom: boolean;
}

export const ARCHITECTURE_REVIEW = {
  id: 'architecture-review',
  name: 'Architecture Review',
  price: ARCHITECTURE_REVIEW_PRICE,
  startsFrom: false,
} as const satisfies EngagementRung;

export const LAUNCH_PACKAGE = {
  id: 'launch-package',
  name: 'Launch Package',
  price: LAUNCH_PACKAGE_PRICE,
  startsFrom: false,
} as const satisfies EngagementRung;

export const FLEET_STAMP = {
  id: 'fleet-stamp',
  name: 'Fleet Stamp',
  price: '$25,000',
  startsFrom: true,
} as const satisfies EngagementRung;

export const CUSTOM_BUILD = {
  id: 'custom-build',
  name: 'Custom Build',
  price: '$50,000',
  startsFrom: true,
} as const satisfies EngagementRung;

export const AI_INTEGRATION = {
  id: 'ai-integration',
  name: 'AI Integration',
  price: 'Fixed-bid',
  startsFrom: false,
} as const satisfies EngagementRung;

/** Fixed-bid intake rungs shared with product Track D. */
export const INTAKE_RUNGS = [ARCHITECTURE_REVIEW, LAUNCH_PACKAGE] as const;

/** Productized forward-deploy lanes sold through Studio. */
export const PRODUCTIZED_LANES = [FLEET_STAMP, CUSTOM_BUILD, AI_INTEGRATION] as const;

/** Display form: "$3,500" or "from $25,000". */
export function engagementPriceDisplay(rung: EngagementRung): string {
  if (rung.price === 'Fixed-bid') return 'Fixed-bid engagement. Scoped in discovery.';
  return rung.startsFrom ? `From ${rung.price}. Scoped in discovery.` : rung.price;
}
