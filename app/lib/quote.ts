/**
 * Three-question studio calculator.
 *
 * Same questions as the product-site tool. This site defaults to Studio
 * ("You will") instead of self-host ("I will"). No fleet math. Enterprise
 * is not priced here.
 */

import { LAUNCH_PACKAGE, WORKING_SESSION, WRITTEN_PLAN } from '@/lib/engagements';

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
  { value: 'hour', label: 'One hour with Joshua (debug / pair)' },
  { value: 'plan', label: 'A written plan' },
  { value: 'launch', label: 'One live flow on my accounts (site or booking + Stripe)' },
] as const satisfies readonly { value: Outcome; label: string }[];

export const PLACES_OPTIONS = [
  { value: 'one', label: 'One business, one site' },
  { value: 'many', label: 'More than one (stop quoting; book an intro)' },
] as const satisfies readonly { value: Places; label: string }[];

export const QUOTE_OWNERSHIP = [
  'You own the accounts and the data.',
  'If we disappear, you still have the company.',
] as const;

export const QUOTE_INTRO_LINE =
  'Want a human? Book a 30-minute intro on Google Calendar. Meet or sit down.' as const;

export const SELF_HOST_FREE = 'Free: run the open stack. $0 + your infra.' as const;
export const SELF_HOST_PAID =
  'If you want agents/memory: Pro $49/mo or Max $299/mo. 7-day trial. 14-day first-month refund.' as const;
export const SELF_HOST_ENTERPRISE = 'Enterprise: not in the calculator. Book an intro.' as const;

export const LAUNCH_HOLDBACK =
  'Half now, half when the four tests pass (your infra, your Stripe checkout, signup-to-paid, one receipted agent action). If we miss, we keep working or you get the first half back and keep the stack.' as const;

export type QuoteKind = 'studio' | 'self-host' | 'intro';

export interface QuoteLine {
  readonly id: string;
  readonly title: string;
  readonly price: string;
  readonly detail: string;
  readonly highlighted: boolean;
  readonly holdback: boolean;
}

export interface Quote {
  readonly kind: QuoteKind;
  readonly heading: string;
  readonly body: string;
  readonly lines: readonly QuoteLine[];
  readonly stopQuoting: boolean;
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
      title: 'Hour',
      price: WORKING_SESSION.price,
      detail: 'Invoice before we start. No holdback.',
      highlighted: outcome === 'hour',
      holdback: false,
    },
    {
      id: WRITTEN_PLAN.id,
      title: 'Written plan',
      price: WRITTEN_PLAN.price,
      detail: 'Half now, half on delivery. Credits to a launch in 30 days.',
      highlighted: outcome === 'plan',
      holdback: false,
    },
    {
      id: LAUNCH_PACKAGE.id,
      title: 'Launch',
      price: LAUNCH_PACKAGE.price,
      detail: LAUNCH_HOLDBACK,
      highlighted: outcome === 'launch',
      holdback: true,
    },
  ];
}

function selfHostLines(): readonly QuoteLine[] {
  return [
    {
      id: 'free',
      title: 'Free',
      price: '$0',
      detail: SELF_HOST_FREE,
      highlighted: false,
      holdback: false,
    },
    {
      id: 'pro-max',
      title: 'Pro or Max',
      price: '$49 / $299',
      detail: SELF_HOST_PAID,
      highlighted: false,
      holdback: false,
    },
    {
      id: 'enterprise',
      title: 'Enterprise',
      price: 'Intro',
      detail: SELF_HOST_ENTERPRISE,
      highlighted: false,
      holdback: false,
    },
  ];
}

export function buildQuote(answers: QuoteAnswers): Quote {
  if (answers.places === 'many') {
    return {
      kind: 'intro',
      heading: 'Stop quoting. Book an intro.',
      body: 'More than one business or site is not a calculator quote. We talk it through on a 30-minute intro.',
      lines: [],
      stopQuoting: true,
    };
  }

  if (answers.hoster === 'self-host') {
    return {
      kind: 'self-host',
      heading: 'Self-host',
      body: 'You put it live on your accounts. The open stack is free. Agents and memory are a product subscription.',
      lines: selfHostLines(),
      stopQuoting: false,
    };
  }

  return {
    kind: 'studio',
    heading: 'Studio',
    body: 'I put it live on your accounts. Invoice after we agree. There is no checkout on this site.',
    lines: studioLines(answers.outcome),
    stopQuoting: false,
  };
}
