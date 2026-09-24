/**
 * Studio quote calculator.
 *
 * Studio quotes only. Product licenses live on revealui.com.
 * This site defaults to Studio ("Studio implements with me") instead of
 * self-host ("I self-host (product site)"), and defaults the outcome to
 * Proof Sprint. Self-host hops to the product site. No fleet math. No product SKUs.
 * Public word PROOF means a receipted action, not outcome validation.
 */

import {
  CONSULTATION_HOUR_OPTIONS,
  consultationDueCents,
  consultationHourCount,
  consultationHourLabel,
  DEFAULT_CONSULTATION_HOURS,
} from '@/lib/consultation-hours';
import {
  DOMAIN_PACK_CREDIT_LABEL,
  DOMAIN_PACK_DUE_LABEL,
  DOMAIN_PACK_LIST_LABEL,
} from '@/lib/domain-pack';
import { CONSULTATION, LAUNCH, PROOF_SPRINT } from '@/lib/engagements';
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
  { value: 'consultation', label: 'Consultation — diagnose the path / proof gap ($300)' },
  { value: 'plan', label: 'Proof Sprint — one site, one receipted action I operate' },
  { value: 'launch', label: 'Launch — money path live on my accounts' },
] as const satisfies readonly { value: Outcome; label: string }[];

export const PLACES_OPTIONS = [
  { value: 'one', label: 'One business, one site' },
  { value: 'many', label: 'More than one — book an intro' },
] as const satisfies readonly { value: Places; label: string }[];

export const QUOTE_CALCULATOR_HEADING = 'Who runs it. What has to work. One price.' as const;

export const QUOTE_CALCULATOR_LEAD =
  'Studio quotes only: Consultation $300, Proof Sprint $3,997, Launch $14,500. Solutions for critical-path ownership, agents without PROOF, and a live money path. PROOF means a receipted action, not outcome validation or proof of work. Licenses live on revealui.com.' as const;

export const CONSULTATION_QUOTE_DETAIL =
  'One focused pass on the critical path, proof gaps, or a stuck live flow. Notes + next step. Pay $300 when you book the hour. No leftover site. No holdback.' as const;

export const PROOF_QUOTE_DETAIL =
  'One site. One receipted action you operate. The domain pack is included. You keep it. Invoice $3,997 before we start. Credits 100% to Launch if you start Launch within 45 days.' as const;

export const LAUNCH_QUOTE_DETAIL =
  'One live money path on your accounts. Architecture inside this offer. Half now, half on delivery. You own the result.' as const;

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
  'You run it, or we implement with you. Consultation is paid when you book the hour. Proof Sprint and Launch are invoiced after we agree.' as const;

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
  /** Optional Stage B add-on. Default off. Included offers do not add a second charge. */
  readonly stageB?: boolean;
  readonly stageBWaive?: boolean;
  readonly viewerRole?: ViewerRole;
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
  if (answers.stageB !== true) return [];
  const included = answers.outcome === 'plan' || answers.outcome === 'launch';
  if (included) {
    return [
      {
        id: 'stage-b',
        title: DOMAIN_PACK_LIST_LABEL,
        price: 'Included',
        detail: 'Included with this offer.',
        highlighted: false,
      },
    ];
  }
  const role = answers.viewerRole === 'owner' ? 'owner' : 'guest';
  const invoice = buildStageBInvoice({
    attached: true,
    waive: role === 'owner' && answers.stageBWaive === true,
    role,
  });
  const lines: QuoteLine[] = [
    {
      id: 'stage-b-list',
      title: DOMAIN_PACK_LIST_LABEL,
      price: formatUsdFromCents(invoice.listCents),
      detail: 'List price. Optional domain pack.',
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

function studioLines(answers: QuoteAnswers): readonly QuoteLine[] {
  const hours = consultationHourCount(answers.consultationHours ?? DEFAULT_CONSULTATION_HOURS);
  return [
    {
      id: CONSULTATION.id,
      title: CONSULTATION.name,
      price: formatUsdFromCents(consultationDueCents(hours)),
      detail: consultationQuoteDetail(hours),
      highlighted: answers.outcome === 'consultation',
    },
    {
      id: PROOF_SPRINT.id,
      title: PROOF_SPRINT.name,
      price: PROOF_SPRINT.price,
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
    heading: 'Studio',
    body: STUDIO_QUOTE_BODY,
    lines: studioLines(answers),
    stopQuoting: false,
  };
}
