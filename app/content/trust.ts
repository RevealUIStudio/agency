/**
 * Auditor Marketer-paste (2026-09-13). Source of truth for public Trust/SOC 2
 * copy. Do not strengthen. Do not invent vendor claims beyond this list.
 * Light layout-only edits: the vendor list uses a comma instead of an em dash.
 */

export const TRUST_TITLE = 'Trust' as const;

export const TRUST_SHORT = [
  'RevealUI Studio is not SOC 2 or ISO 27001 certified today.',
  'We are building toward SOC 2\u2013capable controls for the Studio and product stack we operate. That roadmap is public below. We will only say RevealUI Studio is SOC 2 certified when an independent auditor issues a report that names our in-scope system and period.',
  'Infrastructure vendors we use publish their own SOC 2 Type II attestations for their platforms, including Neon (database), Vercel (hosting), Fly.io (long-running services), Stripe (payments), and Sentry (error telemetry). Those reports cover the vendor, not RevealUI Studio. Shared responsibility still applies: their attestation is not our certification.',
] as const;

export const TRUST_ROADMAP = [
  {
    label: 'Now',
    items: [
      'RevealUI Studio is not SOC 2 or ISO 27001 certified today.',
      'We are building toward SOC 2\u2013capable controls for the Studio and product stack we operate.',
      'Vendors we use publish SOC 2 Type II attestations for their own platforms. Those reports cover the vendor, not RevealUI Studio.',
    ],
  },
  {
    label: 'Next',
    items: [
      'Keep this roadmap public and honest.',
      'Share vendor attestations under NDA and describe current controls when asked.',
    ],
  },
  {
    label: 'When cash',
    items: [
      'Engage an independent auditor for an in-scope Studio system and period.',
      'A Studio SOC 2 report will be shared when it exists.',
    ],
  },
  {
    label: 'Not claimed until a Studio report exists',
    items: [
      'That RevealUI Studio is SOC 2 certified.',
      'That RevealUI Studio is SOC 2 audited, compliant, or SOC 2 ready.',
      'That our stack is SOC 2 because a vendor is.',
    ],
  },
] as const;

export const TRUST_FAQ = [
  {
    q: 'Are you SOC 2 certified?',
    a: 'Not yet. We publish an honest roadmap toward SOC 2\u2013capable controls. Vendors we use (Neon, Vercel, Fly, Stripe, and others) publish SOC 2 Type II for their own platforms; that is not a RevealUI Studio certification.',
  },
  {
    q: 'Can you share compliance docs?',
    a: 'We can share vendor attestations under NDA and describe our current controls. A Studio SOC 2 report will be shared when it exists.',
  },
] as const;
