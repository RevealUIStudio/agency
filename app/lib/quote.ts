/**
 * Studio quote calculator.
 *
 * Studio quotes only. Product licenses live on revealui.com.
 * This site defaults to Studio ("Studio implements with me") instead of
 * self-host ("I self-host (product site)"), and defaults the outcome to
 * Pilot. Self-host hops to the product site. No fleet math. No product SKUs.
 * Public word PROOF means a receipted action, not outcome validation.
 * Adapter is an add-on. It is not an outcome, and it is not sold alone.
 */

import {
  CONSULTATION_HOUR_OPTIONS,
  consultationDueCents,
  consultationHourCount,
  consultationHourLabel,
  DEFAULT_CONSULTATION_HOURS,
} from '@/lib/consultation-hours';
import { DOMAIN_PACK_CREDIT_LABEL, DOMAIN_PACK_DUE_LABEL } from '@/lib/domain-pack';
import {
  ADAPTER,
  ADAPTER_CALC_LABEL,
  ADAPTER_CARE_HELP,
  ADAPTER_CATEGORIES,
  ADAPTER_CENTS,
  ADAPTER_INCLUDED_ON_LAUNCH,
  ADAPTER_INCLUDED_ON_PILOT,
  ADAPTER_ROLE,
  CARE,
  CONSULTATION,
  LAUNCH,
  PILOT,
  STAGE_B_PRICE,
} from '@/lib/engagements';
import { formatUsdFromCents } from '@/lib/money';
import { PRODUCT_SITE_URL } from '@/lib/site';
import { buildStageBInvoice, type ViewerRole } from '@/lib/stage-b-invoice';

export type Hoster = 'self-host' | 'studio';
export type Outcome = 'consultation' | 'plan' | 'launch';
export type Places = 'one' | 'many';

export type { ViewerRole };
export { CONSULTATION_HOUR_OPTIONS, consultationHourLabel, DEFAULT_CONSULTATION_HOURS };

export const DEFAULT_HOSTER: Hoster = 'studio';
export const DEFAULT_OUTCOME: Outcome = 'plan';
export const DEFAULT_PLACES: Places = 'one';

export const HOSTER_OPTIONS = [
  { value: 'self-host', label: 'I self-host (product site)' },
  { value: 'studio', label: 'Studio implements with me' },
] as const satisfies readonly { value: Hoster; label: string }[];

export const OUTCOME_OPTIONS = [
  { value: 'consultation', label: 'Consultation: $300/hr' },
  {
    value: 'plan',
    label: 'Pilot: one site, one receipted action I operate (includes 1 Adapter)',
  },
  {
    value: 'launch',
    label: 'Launch: money path live on your accounts (includes up to 3 Adapters)',
  },
] as const satisfies readonly { value: Outcome; label: string }[];

export const PLACES_OPTIONS = [
  { value: 'one', label: 'One business, one site' },
  { value: 'many', label: 'More than one site' },
] as const satisfies readonly { value: Places; label: string }[];

export const QUOTE_CALCULATOR_HEADING = 'Find your starting point.' as const;

export const QUOTE_CALCULATOR_LEAD =
  `Choose who will implement the system, the outcome you need, and the number of sites. The result shows the relevant engagement and listed price. ${ADAPTER.name} ${ADAPTER.price}. ${CARE.name} ${CARE.price}. Domain add-on ${STAGE_B_PRICE}. Product licenses are separate.` as const;

export const CONSULTATION_QUOTE_DETAIL =
  'A focused review of your system. You receive session notes and a recommended next step. Pay $300 when you book the hour. Implementation and ongoing support are separate.' as const;

export const PROOF_QUOTE_DETAIL =
  'One supported action on one site, with a record you can inspect. Includes 1 Adapter (one tool category). The domain pack is included. Invoice $3,997 before work starts. Credit toward Launch follows the agreed 45-day terms.' as const;

export const LAUNCH_QUOTE_DETAIL =
  'One agreed business flow on your accounts, with up to 3 Adapters (one tool category each), architecture, a runbook, and 30 days of async stabilization. Half before work starts, half on delivery.' as const;

export const QUOTE_OWNERSHIP = [
  'You own the accounts and the data.',
  'Review the software licenses, service dependencies, and maintenance responsibilities before choosing your setup.',
] as const;

export const QUOTE_INTRO_LINE =
  'Want a human? Book a 30-minute intro (Google Calendar / Google Meet).' as const;

export const SELF_HOST_HANDOFF = 'Self-host licenses are on revealui.com.' as const;

export const INTRO_HEADING = 'More than one site: book an intro' as const;

export const INTRO_BODY =
  'Multi-site is not a calculator quote. We scope it on a 30-minute intro.' as const;

export const STUDIO_QUOTE_BODY =
  `You run it, or we implement with you. Consultation is paid when you book the hour. Pilot and Launch are invoiced after we agree. ${ADAPTER_ROLE}` as const;

export const ADAPTER_EXTRA_MIN = 0 as const;
export const ADAPTER_EXTRA_MAX = 6 as const;
export const ADAPTER_EXTRA_OPTIONS = [0, 1, 2, 3, 4, 5, 6] as const;

export const ADAPTER_CALCULATOR_HELP =
  `Pilot includes ${ADAPTER_INCLUDED_ON_PILOT}. Launch includes up to ${ADAPTER_INCLUDED_ON_LAUNCH}. This count is extras beyond that, at ${ADAPTER.price} each (one tool category). ${ADAPTER_CARE_HELP} Additional work is scoped before invoicing.` as const;

/** Buyer name for the $297 custom-domain line on the calculator. SKU id stays stage-b. */
export const DOMAIN_ADD_ON_LABEL = 'Domain add-on' as const;

/** Calculator checkbox. Book page keeps its own label. */
export const CALCULATOR_DOMAIN_ADD_ON = `${DOMAIN_ADD_ON_LABEL}: ${STAGE_B_PRICE}` as const;

export function adapterExtraCount(count: number | undefined): number {
  if (count === undefined) return ADAPTER_EXTRA_MIN;
  if (!Number.isInteger(count) || count < ADAPTER_EXTRA_MIN || count > ADAPTER_EXTRA_MAX) {
    return ADAPTER_EXTRA_MIN;
  }
  return count;
}

export function adapterExtraLabel(count: number): string {
  const extras = adapterExtraCount(count);
  if (extras === 0) return 'None';
  const price = formatUsdFromCents(ADAPTER_CENTS * extras);
  const unit = extras === 1 ? 'extra' : 'extras';
  return `${extras} ${unit} · ${price}`;
}

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
  /** Count of Consultation units at $300. Default 1. */
  readonly consultationHours?: number;
  /**
   * Optional Domain add-on. Default off. Included offers do not add a second charge.
   * SKU id stays stage-b.
   */
  readonly stageB?: boolean;
  readonly stageBWaive?: boolean;
  readonly viewerRole?: ViewerRole;
  /** Adapter units beyond the included count (Pilot 1, Launch 3). Default 0. */
  readonly adapterExtras?: number;
}

export function consultationQuoteDetail(hours: number): string {
  const count = consultationHourCount(hours);
  if (count === 1) return CONSULTATION_QUOTE_DETAIL;
  const price = formatUsdFromCents(consultationDueCents(count));
  return CONSULTATION_QUOTE_DETAIL.replace(
    'Pay $300 when you book the hour',
    `Pay ${price} when you book the hours`,
  );
}

function stageBLines(answers: QuoteAnswers): readonly QuoteLine[] {
  const included = answers.outcome === 'plan' || answers.outcome === 'launch';
  if (included) {
    return [
      {
        id: 'stage-b',
        title: DOMAIN_ADD_ON_LABEL,
        price: 'Included',
        detail: 'Included with this offer.',
        highlighted: false,
      },
    ];
  }
  if (answers.stageB !== true) return [];
  const role = answers.viewerRole === 'owner' ? 'owner' : 'guest';
  const invoice = buildStageBInvoice({
    attached: true,
    waive: role === 'owner' && answers.stageBWaive === true,
    role,
  });
  const lines: QuoteLine[] = [
    {
      id: 'stage-b-list',
      title: DOMAIN_ADD_ON_LABEL,
      price: formatUsdFromCents(invoice.listCents),
      detail: 'List price. Optional Domain add-on.',
      highlighted: true,
    },
  ];
  if (invoice.creditCents > 0) {
    lines.push(
      {
        id: 'stage-b-credit',
        title: DOMAIN_PACK_CREDIT_LABEL,
        price: formatUsdFromCents(invoice.creditCents),
        detail: 'Owner credit against the list price.',
        highlighted: false,
      },
      {
        id: 'stage-b-due',
        title: DOMAIN_PACK_DUE_LABEL,
        price: formatUsdFromCents(invoice.dueCents),
        detail: 'List price minus the credit.',
        highlighted: false,
      },
    );
  }
  return lines;
}

function adapterLines(answers: QuoteAnswers): readonly QuoteLine[] {
  if (answers.outcome === 'consultation') return [];
  const extras = adapterExtraCount(answers.adapterExtras);
  const category = `One tool category: ${ADAPTER_CATEGORIES}.`;
  const onPilot = answers.outcome === 'plan';
  const lines: QuoteLine[] = [
    {
      id: 'adapter-included',
      title: ADAPTER_CALC_LABEL,
      price: 'Included',
      detail: onPilot
        ? `Pilot includes ${ADAPTER_INCLUDED_ON_PILOT} Adapter. ${category}`
        : `Launch includes up to ${ADAPTER_INCLUDED_ON_LAUNCH} Adapters. ${category}`,
      highlighted: false,
    },
  ];
  if (extras > 0) {
    lines.push({
      id: 'adapter-extra',
      title: extras === 1 ? 'Adapter (extra)' : `Adapter (extra) (${extras})`,
      price: formatUsdFromCents(ADAPTER_CENTS * extras),
      detail: onPilot
        ? `2nd and later Adapters are ${ADAPTER.price} each. One tool category per unit.`
        : `4th and later Adapters are ${ADAPTER.price} each. One tool category per unit.`,
      highlighted: true,
    });
  }
  return lines;
}

function studioLines(answers: QuoteAnswers): readonly QuoteLine[] {
  const hours = consultationHourCount(answers.consultationHours ?? DEFAULT_CONSULTATION_HOURS);
  const offers: QuoteLine[] = [
    {
      id: CONSULTATION.id,
      title: CONSULTATION.name,
      price: formatUsdFromCents(consultationDueCents(hours)),
      detail: consultationQuoteDetail(hours),
      highlighted: answers.outcome === 'consultation',
    },
    {
      id: PILOT.id,
      title: PILOT.name,
      price: PILOT.price,
      detail: PROOF_QUOTE_DETAIL,
      highlighted: answers.outcome === 'plan',
    },
    {
      id: LAUNCH.id,
      title: LAUNCH.name,
      price: LAUNCH.price,
      detail: LAUNCH_QUOTE_DETAIL,
      highlighted: answers.outcome === 'launch',
    },
  ];
  return [
    ...offers.filter((line) => line.highlighted),
    ...adapterLines(answers),
    ...stageBLines(answers),
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
    heading:
      answers.outcome === 'consultation'
        ? CONSULTATION.name
        : answers.outcome === 'plan'
          ? PILOT.name
          : LAUNCH.name,
    body: STUDIO_QUOTE_BODY,
    lines: studioLines(answers),
    stopQuoting: false,
  };
}
