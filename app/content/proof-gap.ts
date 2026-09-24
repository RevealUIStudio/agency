/**
 * Proof-gap checklist lead magnet. Soft ask, not a quote form.
 * H1 and gate copy locked 2026-09-18 (Joshua OK publish).
 * PROOF = receipted action. Studio ladder stays Consultation / Proof Sprint / Launch.
 */

export const PROOF_GAP_PATH = '/proof-gap' as const;

export const PROOF_GAP_PDF_HREF = '/proof-gap-checklist.pdf' as const;

export const PROOF_GAP_H1 = 'Can you prove what your agents did last week?' as const;

export const PROOF_GAP_DOCUMENT_TITLE = 'Proof-gap checklist | RevealUI Studio' as const;

export const PROOF_GAP_META_DESCRIPTION =
  'Can you prove what your agents did last week? Free checklist. Score ownership, critical path, receipts (PROOF), and human gates in about ten minutes. No quote form required.' as const;

export const PROOF_GAP_OFFER_NAME = 'Proof-gap checklist' as const;

export const PROOF_GAP_SUB =
  'Free checklist. Score ownership, critical path, receipts (PROOF), and human gates in about ten minutes. No quote form required.' as const;

/** Known-for identity. Subline only. Never this page's H1. */
export const PROOF_GAP_KNOWN_FOR =
  'We are known for the agentic business runtime technical founders and small agencies operate on their own domain. Existing tools report in. You keep the stack.' as const;

export const PROOF_GAP_PROOF_LINE =
  'PROOF is a receipted action: a durable record that an agent really did something on your system (identity · time · target).' as const;

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
  "Walk the sections. Count No + Partial. Pick one gap you'd be embarrassed to leave open in a client update this week, then fix that path until you can show a receipted action (PROOF)." as const;

export const PROOF_GAP_THANKS_CONSULT =
  'If you want a diagnose with us: Consultation is $300: path + proof-gap map, pack within one business day.' as const;

export const PROOF_GAP_THANKS_INTRO =
  "Optional 30-minute intro: you don't need a Google account. Open the Meet link → Join as guest." as const;

export const PROOF_GAP_DOWNLOAD_LABEL = 'Download the PDF' as const;

export const PROOF_GAP_LADDER = 'Consultation $300 · Proof Sprint $3,997 · Launch $14,500' as const;

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
    title: '1) Ownership & domain',
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
    redFlag: '“Our agency’s Cursor did it” with no artifact on the client’s accounts.',
  },
  {
    title: '2) Tools that talk (without a spaghetti critical path)',
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
    title: '3) Receipted actions (PROOF)',
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
        text: 'Receipts tie to identity + time + target (who / what / when), not a vibes summary',
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
    redFlag: '“The agent said it worked” is the only proof.',
  },
  {
    title: '4) Humans in the loop (gates)',
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
    redFlag: 'Autodialer energy, spray-and-pray CRM, or “just let the agent email everyone.”',
  },
  {
    title: '5) Client / stakeholder updates',
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
        text: 'Stakeholders know Free vs paid gates (no accidental “Unlimited” theater)',
      },
      {
        id: '5.4',
        text: 'Architecture talk matches what actually runs (no orphan diagrams)',
      },
    ],
    redFlag: 'Beautiful decks; no durable trail.',
  },
  {
    title: '6) Catalog honesty (if you sell or package AI)',
    checks: [
      { id: '6.1', text: 'Public prices match checkout' },
      { id: '6.2', text: '“Coming soon” isn’t sold as live' },
      {
        id: '6.3',
        text: 'You don’t claim SOC 2 / compliance theater you don’t have',
      },
      {
        id: '6.4',
        text: 'Chatbot SaaS isn’t what you’re shipping if buyers keep the keys',
      },
    ],
    redFlag: 'Catalog and checkout tell different stories.',
  },
] as const;

export const PROOF_GAP_SCORE_BANDS = [
  { band: '0–3', meaning: 'Tight. Keep shipping; spot-check receipts monthly.' },
  { band: '4–8', meaning: 'Typical. Pick one §3 or §1 gap this week.' },
  { band: '9+', meaning: 'Exposed. Don’t scale outreach until PROOF exists on one path.' },
] as const;

export const PROOF_GAP_SCORE_PROMPT = 'My score: ____ / 24 checks marked No or Partial.' as const;

export const PROOF_GAP_ONE_GAP_PROMPT = 'The one gap I’d fix this week:' as const;

export const PROOF_GAP_NEXT_STEPS = [
  'DIY: Fix that one gap on your stack. Re-run §3 until you can show one receipted action.',
  'Diagnose with us: Consultation $300. Path + proof-gap map; artifact pack within one business day. Lightweight stack sketch (not Architecture sold as Consultation).',
  'Operate a slice: Proof Sprint $3,997. One site. One receipted action you operate. The domain pack is included.',
] as const;

export const PROOF_GAP_REFUSALS = [
  'Not “faster than Zap.”',
  'Not cheaper than freelancers.',
  'Not SOC 2 certified.',
  'Not a hosted chatbot you rent forever.',
  'Not Architecture sold as Consultation.',
  'Not a fourth Studio menu price.',
] as const;
