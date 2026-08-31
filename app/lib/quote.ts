/**
 * Three-question studio calculator.
 *
 * Studio quotes only. Product licenses live on revealui.com.
 * This site defaults to Studio ("You will") instead of self-host ("I will").
 * Self-host hops to the product site. No fleet math. No product SKUs.
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
  { value: 'self-host', label: 'I will (developer / self-host)' },
  { value: 'studio', label: 'You will (Studio)' },
] as const satisfies readonly { value: Hoster; label: string }[];

export const OUTCOME_OPTIONS = [
  { value: 'hour', label: 'Consultation' },
  { value: 'plan', label: 'Pilot' },
  { value: 'launch', label: 'Launch' },
] as const satisfies readonly { value: Outcome; label: string }[];

export const PLACES_OPTIONS = [
  { value: 'one', label: 'One business, one place' },
  { value: 'many', label: 'More than one (stop quoting; book an intro)' },
] as const satisfies readonly { value: Places; label: string }[];

export const QUOTE_CALCULATOR_LEAD =
  'This calculator is for Studio quotes only. They operate, or they pay to implement. Product licenses live on revealui.com.' as const;

export const QUOTE_OWNERSHIP = [
  'You own the accounts and the data.',
  'If we disappear, you still have the company.',
] as const;

export const QUOTE_INTRO_LINE =
  'Want a human? Book a 30-minute intro on Google Calendar. Meet or sit down.' as const;

export const SELF_HOST_HANDOFF = 'Start free on the product site.' as const;

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
      heading: 'Stop quoting. Book an intro.',
      body: 'More than one business or site is not a calculator quote. We talk it through on a 30-minute intro.',
      lines: [],
      stopQuoting: true,
    };
  }

  return {
    kind: 'studio',
    heading: 'Studio',
    body: 'They operate, or they pay to implement. Invoice after we agree. There is no checkout on this site.',
    lines: studioLines(answers.outcome),
    stopQuoting: false,
  };
}
