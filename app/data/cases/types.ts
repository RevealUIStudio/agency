export interface CaseStudyMetric {
  label: string;
  value: string;
  needsApproval?: true;
}

export interface CaseStudyQuote {
  text: string;
  attribution: string;
  needsApproval?: true;
}

export interface CaseStudy {
  slug: string;
  customer: string;
  customerLogo?: string;
  industry: string;
  engagementShape: 'fleet-trial-kit' | 'custom-build' | 'ai-integration' | 'composite';
  headline: string;
  summary: string;
  challenge: string;
  approach: string;
  outcome: string;
  quote?: CaseStudyQuote;
  metrics?: CaseStudyMetric[];
  stack: string[];
  timeline: string;
  publishedAt?: string;
  published: boolean;
}
