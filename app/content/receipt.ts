// Demonstration content for the homepage receipt motif.
// Static timestamps only (never Date.now()). Not live production data.
// Shows how a studio engagement runs: intro booked, $300 Consultation
// invoiced, notes delivered, audit-log records the receipt. No customer
// name, no case study, no invented company.

import type { AuditEvent } from '@revealui/presentation';

export const RECEIPT_HERO_TITLE = 'How we work, on record' as const;

export const RECEIPT_HERO_LINES: readonly AuditEvent[] = [
  {
    ts: '09:00:12',
    actor: 'calendar',
    action: 'booked',
    object: 'a 30-minute intro',
  },
  {
    ts: '09:42:08',
    actor: 'studio',
    action: 'invoiced',
    object: 'Consultation $300',
  },
  {
    ts: '11:15:03',
    actor: 'studio',
    action: 'delivered',
    object: 'session notes',
  },
  {
    ts: '11:15:07',
    actor: 'audit-log',
    action: 'recorded',
    object: 'the receipt',
    refId: 'rcpt_demo1',
  },
] as const;

export const RECEIPT_HERO_INTEGRITY = {
  kind: 'sha256',
  value: '4c1a…9e20',
} as const;

// Canonical foil. Process page is the honest next hop, not a second CTA.
export const RECEIPT_HERO_CAPTION = {
  text: "If an agent did it, there's a receipt.",
  link: { label: 'How we work →', href: '/process' },
} as const;
