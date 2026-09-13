/**
 * Studio quote calculator.
 *
 * Studio quotes only. Product licenses live on revealui.com.
 * This site defaults to Studio ("Studio implements with me") instead of
 * self-host ("I self-host (product site)"). Self-host hops to the product
 * site. No fleet math. No product SKUs.
 */

import { LAUNCH_PACKAGE, WORKING_SESSION, WRITTEN_PLAN } from '@/lib/engagements';
import { PRODUCT_SITE_URL } from '@/lib/site';

export type Hoster = 'self-host' | 'studio';
export type Outcome = 'hour' | 'plan' | 'launch';
export type Places = 'one' | 'many';

export const DEFAULT_HOSTER: Hoster = 'studio';
export const DEFAULT_OUTCOME: Outcome = 'launch';
export const DEFAULT_PLACES: Places = 'one';

export const HOSTER_OPTIONS = [
  { value: 'self-host', label: 'I self-host (product site)' },
  { value: 'studio', label: 'Studio implements with me' },
] as const satisfies readonly { value: Hoster; label: string }[];

export const OUTCOME_OPTIONS = [
  { value: 'hour', label: 'Consultation' },
  { value: 'plan', label: 'Pilot' },
  { value: 'launch', label: 'Launch' },
] as const satisfies readonly { value: Outcome; label: string }[];

export const PLACES_OPTIONS = [
  { value: 'one', label: 'One business, one site' },
  { value: 'many', label: 'More than one — book an intro' },
] as const satisfies readonly { value: Places; label: string }[];

export const QUOTE_CALCULATOR_HEADING = 'Who runs it. What you need. One price.' as const;

export const QUOTE_CALCULATOR_LEAD =
  'Studio quotes only: Consultation $300, Pilot $1,500, Launch $7,500. For startups and small agencies already running agents. Licenses live on revealui.com.' as const;

export const QUOTE_OWNERSHIP = [
  'You own the accounts and the data.',
  'If we disappear, you still have the company.',
] as const;

export const QUOTE_INTRO_LINE =
  'Want a human? Book a 30-minute intro (Google Calendar / Meet).' as const;

export const SELF_HOST_HANDOFF = 'Self-host licenses are on revealui.com.' as const;

export const INTRO_HEADING = 'More than one site — book an intro' as const;

export const INTRO_BODY =
  'Multi-site is not a calculator quote. We scope it on a 30-minute intro.' as const;

export const STUDIO_QUOTE_BODY =
  'You run it, or we implement with you. Invoice after we agree. No checkout on this site.' as const;

export type QuoteKind = 'studio' | 'self-host' | 'intro';

export interface QuoteLine {
  readonly id: string;
  readonly title: string;
  readonly price: string;
  readonly detail: string;
  readonly highlighted: boolean;
}

export interface Quote {
  readonly kind: QuoteKind;
  readonly heading: string;
  readonly body: string;
  readonly lines: readonly QuoteLine[];
  readonly stopQuoting: boolean;
  readonly productHandoffUrl?: string;
}

export interface QuoteAnswers {
  readonly hoster: Hoster;
  readonly outcome: Outcome;
  readonly places: Places;
}

function studioLines(outcome: Outcome): readonly QuoteLine[] {
  return [
    {
      id: WORKING_SESSION.id,
      title: WORKING_SESSION.name,
      price: WORKING_SESSION.price,
      detail: 'Invoice before we start. No leftover site. No holdback.',
      highlighted: outcome === 'hour',
    },
    {
      id: WRITTEN_PLAN.id,
      title: WRITTEN_PLAN.name,
      price: WRITTEN_PLAN.price,
      detail: WRITTEN_PLAN.payment,
      highlighted: outcome === 'plan',
    },
    {
      id: LAUNCH_PACKAGE.id,
      title: LAUNCH_PACKAGE.name,
      price: LAUNCH_PACKAGE.price,
      detail: LAUNCH_PACKAGE.payment,
      highlighted: outcome === 'launch',
    },
  ];
}

export function buildQuote(answers: QuoteAnswers): Quote {
  if (answers.hoster === 'self-host') {
    return {
      kind: 'self-host',
      heading: SELF_HOST_HANDOFF,
      body: '',
      lines: [],
      stopQuoting: true,
      productHandoffUrl: PRODUCT_SITE_URL,
    };
  }

  if (answers.places === 'many') {
    return {
      kind: 'intro',
      heading: INTRO_HEADING,
      body: INTRO_BODY,
      lines: [],
      stopQuoting: true,
    };
  }

  return {
    kind: 'studio',
    heading: 'Studio',
    body: STUDIO_QUOTE_BODY,
    lines: studioLines(answers.outcome),
    stopQuoting: false,
  };
}
