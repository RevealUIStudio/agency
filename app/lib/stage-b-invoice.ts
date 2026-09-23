import { formatUsdFromCents } from './money';

/** Stage B list price is $297. A waive is a credit against that list, not a rewritten price. */
export const STAGE_B_CENTS = 29_700 as const;

export type ViewerRole = 'guest' | 'owner';

export type InvoiceRejectReason = 'guest-waive' | 'integrity';

export class InvoiceRejected extends Error {
  readonly reason: InvoiceRejectReason;

  constructor(reason: InvoiceRejectReason) {
    super(reason);
    this.name = 'InvoiceRejected';
    this.reason = reason;
  }
}

export interface InvoiceLine {
  readonly kind: 'list' | 'credit';
  readonly sku: 'stage-b';
  readonly label: string;
  readonly amountCents: number;
}

export interface StageBInvoice {
  readonly sku: 'stage-b';
  readonly lines: readonly InvoiceLine[];
  readonly listCents: number;
  readonly creditCents: number;
  readonly dueCents: number;
  readonly waivedBy: 'owner' | null;
}

export function assertInvoiceIntegrity(invoice: StageBInvoice): void {
  let list = 0;
  let credit = 0;
  for (const line of invoice.lines) {
    if (line.sku !== 'stage-b' || !Number.isInteger(line.amountCents) || line.amountCents < 0) {
      throw new InvoiceRejected('integrity');
    }
    if (line.kind === 'list') list += line.amountCents;
    else if (line.kind === 'credit') credit += line.amountCents;
    else throw new InvoiceRejected('integrity');
  }
  if (list !== invoice.listCents || credit !== invoice.creditCents) {
    throw new InvoiceRejected('integrity');
  }
  if (invoice.dueCents !== list - credit) throw new InvoiceRejected('integrity');
  if (invoice.dueCents < 0 || credit > list) throw new InvoiceRejected('integrity');
  if (credit > 0 && invoice.waivedBy !== 'owner') throw new InvoiceRejected('integrity');
  if (credit > 0 && credit !== list) throw new InvoiceRejected('integrity');
  if (
    credit > 0 &&
    !invoice.lines.some((line) => line.kind === 'list' && line.amountCents === list)
  ) {
    throw new InvoiceRejected('integrity');
  }
}

/**
 * `attached` is the optional add-on. Default is off (attached false): no list line.
 * A guest who sets waive is rejected. An owner waive keeps the list line and adds a matching credit.
 */
export function buildStageBInvoice(input: {
  readonly attached: boolean;
  readonly waive: boolean;
  readonly role: ViewerRole;
}): StageBInvoice {
  if (input.waive && input.role !== 'owner') {
    throw new InvoiceRejected('guest-waive');
  }

  if (!input.attached) {
    const empty: StageBInvoice = {
      sku: 'stage-b',
      lines: [],
      listCents: 0,
      creditCents: 0,
      dueCents: 0,
      waivedBy: null,
    };
    assertInvoiceIntegrity(empty);
    return empty;
  }

  const waived = input.waive && input.role === 'owner';
  const lines: InvoiceLine[] = [
    { kind: 'list', sku: 'stage-b', label: 'Stage B', amountCents: STAGE_B_CENTS },
  ];
  if (waived) {
    lines.push({
      kind: 'credit',
      sku: 'stage-b',
      label: 'Stage B credit',
      amountCents: STAGE_B_CENTS,
    });
  }
  const invoice: StageBInvoice = {
    sku: 'stage-b',
    lines,
    listCents: STAGE_B_CENTS,
    creditCents: waived ? STAGE_B_CENTS : 0,
    dueCents: waived ? 0 : STAGE_B_CENTS,
    waivedBy: waived ? 'owner' : null,
  };
  assertInvoiceIntegrity(invoice);
  return invoice;
}

export function formatInvoiceAmount(cents: number): string {
  return formatUsdFromCents(cents);
}
