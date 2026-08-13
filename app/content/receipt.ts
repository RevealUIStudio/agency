// Agency receipt-motif hero content (frontend-excellence Phase 5 rollout echo).
// Demonstration, not live production data: timestamps are static strings
// (never Date.now()) so the sequence is deterministic.
// Depicts agency work: an agent shipping a customer-owned runtime stamp.
// Rails match marketing honesty (demo sequence, copyable ref, foil caption).

import type { AuditEvent } from '@revealui/presentation';

export const RECEIPT_HERO_TITLE = 'Fleet stamp, handed over' as const;

export const RECEIPT_HERO_LINES: readonly AuditEvent[] = [
  {
    ts: '14:02:11',
    actor: 'deploy-agent',
    action: 'signed in as',
    object: 'agents@studio.demo',
  },
  {
    ts: '14:02:18',
    actor: 'deploy-agent',
    action: 'stamped',
    object: 'customer runtime on their VPC',
  },
  {
    ts: '14:02:19',
    actor: 'policy',
    action: 'allowed',
    object: 'domain lock + brand pack',
  },
  {
    ts: '14:02:20',
    actor: 'audit-log',
    action: 'recorded',
    object: 'the receipt',
    refId: 'rcpt_a7e2c1',
  },
] as const;

export const RECEIPT_HERO_INTEGRITY = {
  kind: 'sha256',
  value: '9f2e…c04b',
} as const;

// Canonical foil (copy-voice.md). Product proof lives on revealui.com/claims.
export const RECEIPT_HERO_CAPTION = {
  text: "If an agent did it, there's a receipt.",
  link: { label: 'See the product proof →', href: 'https://revealui.com/claims' },
} as const;
