/**
 * Proof-gap checklist lead magnet. Soft ask, not a quote form.
 * H1 and gate copy locked 2026-09-18 (Joshua OK publish).
 * PROOF = receipted action. Studio ladder stays Consultation / Pilot / Launch.
 */

export const PROOF_GAP_PATH = '/proof-gap' as const;

export const PROOF_GAP_PDF_HREF = '/proof-gap-checklist.pdf' as const;

export const PROOF_GAP_H1 = 'Can you prove what your agents did last week?' as const;

export const PROOF_GAP_DOCUMENT_TITLE = 'Proof-gap checklist | RevealUI Studio' as const;

export const PROOF_GAP_META_DESCRIPTION =
  'Can you prove what your agents did last week? Use this free checklist to review who owns your workflow, which actions leave records, and where human approval is needed. Choose one gap to fix first.' as const;

export const PROOF_GAP_OFFER_NAME = 'Proof-gap checklist' as const;

export const PROOF_GAP_SUB =
  'Use this free checklist to review who owns your workflow, which actions leave records, and where human approval is needed. Choose one gap to fix first.' as const;

/** Known-for identity. Subline only. Never this page's H1. */
export const PROOF_GAP_KNOWN_FOR =
  'We are known for the agentic business runtime technical founders and small agencies operate on their own domain. Existing tools report in. You keep the stack.' as const;

export const PROOF_GAP_PROOF_LINE =
  'An action record names who acted, what they changed, and when. It helps you inspect the action; it does not by itself prove the outcome was correct.' as const;

export const PROOF_GAP_CTA = 'Get the free checklist' as const;

export const PROOF_GAP_BULLETS = [
  'Ownership & domain: whose keys, whose infra',
  'Critical path: who owns booking / invoices / agents',
  'Receipted actions (PROOF): show what ran',
  'Human gates: money, sends, deletes',
  'Client updates you can back with links',
] as const;

export const PROOF_GAP_THANKS_TITLE = 'Your proof-gap checklist' as const;

export const PROOF_GAP_THANKS_LEAD = "Here's your proof-gap checklist." as const;

export const PROOF_GAP_THANKS_BODY =
  'Review each section and count the checks marked No or Partial. Choose the gap that most affects your current workflow and address it first.' as const;

export const PROOF_GAP_THANKS_CONSULT =
  'Want help reviewing the result? Book a Consultation at $300 per hour.' as const;

export const PROOF_GAP_THANKS_INTRO =
  "Optional 30-minute intro: you don't need a Google account. Open the Google Meet link → Join as guest." as const;

export const PROOF_GAP_DOWNLOAD_LABEL = 'Download the PDF' as const;

export const PROOF_GAP_LADDER =
  'Consultation $300 · Pilot $3,997 (includes 1 Adapter) · Launch $14,500 (up to 3 Adapters) · Adapter $2,497 · Stage B $297' as const;

export const PROOF_GAP_REQUEST_TOPIC = 'general' as const;

export const PROOF_GAP_REQUEST_MESSAGE =
  'Please send the proof-gap checklist. I asked from the /proof-gap gate.' as const;

export const PROOF_GAP_HOW_TO = [
  'Walk each section. Mark Yes / Partial / No.',
  'Count No + Partial. That is your proof-gap score (higher = more risk).',
  "Don't chase a perfect score. Pick the one gap that would embarrass you in a client update this week.",
] as const;

export interface ProofGapCheck {
  readonly id: string;
  readonly text: string;
}

export interface ProofGapSection {
  readonly title: string;
  readonly checks: readonly ProofGapCheck[];
  readonly redFlag: string;
}

export const PROOF_GAP_SECTIONS: readonly ProofGapSection[] = [
  {
    title: '1) Accounts and ownership',
    checks: [
      {
        id: '1.1',
        text: 'Agents run on your domain / infra (or a named client’s), not a black-box host you can’t export',
      },
      {
        id: '1.2',
        text: 'You can name who holds Stripe / DNS / GitHub / DB keys for the path that matters',
      },
      {
        id: '1.3',
        text: 'You could leave a vendor and still keep the workflow (data + receipts), even if painful',
      },
      {
        id: '1.4',
        text: '“AI features” aren’t locked to one chat UI you’ll lose if the subscription ends',
      },
    ],
    redFlag: 'The work happened in agency tools, with no record on the client accounts.',
  },
  {
    title: '2) Workflow connections',
    checks: [
      {
        id: '2.1',
        text: 'Booking, invoices, and agent work aren’t three tabs with no shared truth',
      },
      {
        id: '2.2',
        text: 'You know what owns the critical path (Zap / n8n / custom / hope)',
      },
      {
        id: '2.3',
        text: 'Failures surface somewhere humans look, not only in a vendor dashboard',
      },
      {
        id: '2.4',
        text: 'You’re not one undocumented Zap away from “nobody knows how leads get booked”',
      },
    ],
    redFlag: 'Zap owns the revenue path; agents are a side demo.',
  },
  {
    title: '3) Action records',
    checks: [
      {
        id: '3.1',
        text: 'When an agent acts, something durable is written (log / receipt / audit row), not only chat',
      },
      {
        id: '3.2',
        text: 'A non-engineer can open one link and see what ran',
      },
      {
        id: '3.3',
        text: 'Action records identify who acted, what they changed, and when.',
      },
      {
        id: '3.4',
        text: 'You can show a client “this action happened” without screen-sharing your IDE',
      },
      {
        id: '3.5',
        text: 'Failed / refused actions are visible too (fail closed > silent skip)',
      },
    ],
    redFlag: 'The only evidence of the action is the agent response.',
  },
  {
    title: '4) Human approvals',
    checks: [
      {
        id: '4.1',
        text: 'Money moves, sends, and deletes need a named human gate',
      },
      {
        id: '4.2',
        text: 'Outbound (email / Slack) isn’t auto-fired from a prompt without review',
      },
      {
        id: '4.3',
        text: 'Secrets aren’t pasted into chats as the normal path',
      },
      {
        id: '4.4',
        text: 'Plan rules for agents match plan rules for humans (no “agent-only god mode”)',
      },
    ],
    redFlag: 'Outgoing messages can be sent without the required human review.',
  },
  {
    title: '5) Client updates',
    checks: [
      {
        id: '5.1',
        text: 'Weekly update can cite receipts or links, not only narrative',
      },
      {
        id: '5.2',
        text: 'Agencies: you can disclose work without inventing activity',
      },
      {
        id: '5.3',
        text: 'Stakeholders understand which features and limits apply to each plan.',
      },
      {
        id: '5.4',
        text: 'System diagrams describe the software and connections that actually run.',
      },
    ],
    redFlag: 'Updates describe activity without links to action records.',
  },
  {
    title: '6) Pricing and availability',
    checks: [
      { id: '6.1', text: 'Public prices match checkout' },
      { id: '6.2', text: '“Coming soon” isn’t sold as live' },
      {
        id: '6.3',
        text: 'Public certification claims have supporting documentation.',
      },
      {
        id: '6.4',
        text: 'The product description explains who operates the software and holds the accounts.',
      },
    ],
    redFlag: 'Catalog and checkout tell different stories.',
  },
] as const;

export const PROOF_GAP_SCORE_BANDS = [
  { band: '0–3', meaning: 'Review the remaining gaps and check records regularly.' },
  { band: '4–8', meaning: 'Choose one ownership or action-record gap to address.' },
  { band: '9+', meaning: 'Review the gaps before expanding the workflow.' },
] as const;

export const PROOF_GAP_CHECK_COUNT = PROOF_GAP_SECTIONS.reduce(
  (total, section) => total + section.checks.length,
  0,
);

export const PROOF_GAP_SCORE_PROMPT = `My score: ____ / ${PROOF_GAP_CHECK_COUNT} checks marked No or Partial.`;

export const PROOF_GAP_ONE_GAP_PROMPT = 'The one gap I’d fix this week:' as const;

export const PROOF_GAP_NEXT_STEPS = [
  'DIY: Fix that one gap on your stack. Re-run §3 until you can show one receipted action.',
  'Review with Studio: Consultation is $300 per hour. Bring your system and receive session notes and a next step.',
  'Operate a slice: Pilot $3,997. Includes 1 Adapter. One site. One receipted action you operate. The domain pack is included.',
] as const;

export const PROOF_GAP_REFUSALS = [
  'Not “faster than Zap.”',
  'Not cheaper than freelancers.',
  'Not SOC 2 certified.',
  'Not a hosted chatbot you rent forever.',
  'Not Architecture sold as Consultation.',
  'Not a fourth Studio menu price.',
] as const;
