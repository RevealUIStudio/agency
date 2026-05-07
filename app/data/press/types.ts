export interface PressItem {
  slug: string;
  title: string;
  outlet: string;
  outletLogo?: string;
  kind: 'podcast' | 'article' | 'talk' | 'interview' | 'mention';
  date: string;
  externalUrl?: string;
  summary: string;
  pullQuote?: { text: string; needsApproval?: true };
  topics: string[];
  publishedAt?: string;
  published: boolean;
}
