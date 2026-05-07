import { allevia } from './allevia';
import type { CaseStudy } from './types';

export type { CaseStudy };

export const allCases: readonly CaseStudy[] = [allevia];

export const publishedCases: readonly CaseStudy[] = allCases.filter((c) => c.published);

export function findCaseBySlug(slug: string): CaseStudy | undefined {
  return allCases.find((c) => c.slug === slug);
}
