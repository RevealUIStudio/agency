import type { CaseStudy } from './types';

export type { CaseStudy };

/**
 * Stranger-facing labels for unpublished case-study infrastructure.
 * Retired SKU titles (Fleet Stamp, Custom Build, AI Integration) must not
 * paint if a case is ever published. Keep the shape keys; do not sell them.
 */
export const engagementLabels: Record<CaseStudy['engagementShape'], string> = {
  'fleet-trial-kit': 'Engagement',
  'custom-build': 'Engagement',
  'ai-integration': 'Engagement',
  composite: 'Composite engagement',
};

// Empty until a case study is customer-approved to publish. Drafts are
// authored internally and never land in the public bundle. Set
// `published: true` in a per-case file and add to `allCases` here only
// after the customer has signed off in writing.
export const allCases: readonly CaseStudy[] = [];

export const publishedCases: readonly CaseStudy[] = allCases.filter((c) => c.published);

export function findCaseBySlug(slug: string): CaseStudy | undefined {
  return allCases.find((c) => c.slug === slug);
}
