/**
 * Benefits and compliance FAQ source of truth.
 * Keep current status and future plans distinct from delivered benefits.
 * Subprocessors and hosting are categories, not vendor names.
 */

export const TRUST_TITLE = 'A system your team can own and operate.' as const;

export const TRUST_SHORT = [
  'The delivered system lives on your accounts. Your team can take over the code, data, and operating notes.',
  'Choose a defined scope: Consultation gives you session notes and a next step. Pilot delivers one receipted action you operate.',
  'Inspect RevealUI source and documentation before choosing a product license. Studio services help you apply that foundation to your workflow.',
] as const;

export const TRUST_FAQ = [
  {
    q: 'Does RevealUI Studio have a SOC 2 report or ISO 27001 certification?',
    a: 'RevealUI Studio does not currently have an independent SOC 2 report or ISO 27001 certification. Infrastructure vendors we use publish their own SOC 2 Type II attestations for their platforms, including the database, the hosting provider, the host for long-running services, the payments processor, and error telemetry. Those reports cover the vendor, not RevealUI Studio.',
  },
  {
    q: 'What is your SOC 2 journey?',
    a: 'Our roadmap is to develop the controls and evidence needed for an independent assessment of the Studio system we operate. An independent assessment is not scheduled. We will publish progress as it happens and share a Studio SOC 2 report when one exists; the roadmap is not an attestation.',
  },
  {
    q: 'Can you share compliance docs?',
    a: 'We can share vendor attestations under NDA and describe our current controls. A Studio SOC 2 report will be shared when it exists.',
  },
] as const;
