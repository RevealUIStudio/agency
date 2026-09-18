import { LinkButton, ReceiptCard } from '@revealui/presentation';
import {
  RECEIPT_HERO_CAPTION,
  RECEIPT_HERO_INTEGRITY,
  RECEIPT_HERO_LINES,
  RECEIPT_HERO_TITLE,
} from '@/content/receipt';
import { LAUNCH_PACKAGE, WORKING_SESSION, WRITTEN_PLAN } from '@/lib/engagements';
import { CONTACT_EMAIL, INTRO_CALL_URL } from '@/lib/site';

/** Visible H1. Known-for lock: agentic business runtime they operate on their domain. */
export const HERO_HEADLINE =
  'The agentic business runtime startups operate on their own domain.' as const;

/** Document title / OG title. Same known-for sentence as the H1, without the period. */
export const HOME_DOCUMENT_TITLE =
  'RevealUI Studio | The agentic business runtime startups operate on their own domain' as const;

/**
 * Home meta / OG / Twitter description. Known-for H1 + proof subline + ladder.
 * Proof stays out of the H1: receipts, catalog matches checkout, powerful + safe.
 */
export const HOME_META_DESCRIPTION =
  'The agentic business runtime startups operate on their own domain. Technical founders and small agencies who already run agents — existing tools report in, you keep the stack. Powerful + safe: agents leave receipts; catalog matches checkout. Consultation $300. Pilot $1,500. Launch $7,500. Book a 30-minute intro on Google Calendar.' as const;

/** ICP + tools report in / keep the stack. Proof stays in the subline. */
export const HERO_SUBLINE =
  'Technical founders and small agencies who already run agents — existing tools report in, you keep the stack. Powerful + safe: agents leave receipts; catalog matches checkout.' as const;

export const HERO_SHOP_LINE =
  'Tired of booking in one tab, invoices in another, and an agent in a third that leaves no receipt?' as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32 lg:py-40">
        <div className="hero-stagger max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            RevealUI Studio
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {HERO_HEADLINE}
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">{HERO_SUBLINE}</p>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            {HERO_SHOP_LINE} You run it, or I ship it with you. {WORKING_SESSION.name}{' '}
            {WORKING_SESSION.price}. {WRITTEN_PLAN.name} {WRITTEN_PLAN.price}. {LAUNCH_PACKAGE.name}{' '}
            {LAUNCH_PACKAGE.price}. You already live in Cursor. I put booking, invoices, and agents
            with receipts on your domain. Remote first. Sit-down is an option on the same calendar.
            Answer three questions for a quote, or book a 30-minute intro.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <LinkButton href={INTRO_CALL_URL} external>
              Book a 30-minute intro
            </LinkButton>
            <LinkButton href="/#calculator" appearance="outline" variant="neutral">
              Get a quote
            </LinkButton>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No account. No payment to book the intro. Paid work is invoiced after we agree.{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-foreground hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>

          {/*
            Receipt motif. animate="print" once; presentation keeps
            prefers-reduced-motion static. Demonstration ledger only.
          */}
          <div className="mt-12 w-full max-w-md min-w-0 text-left">
            <ReceiptCard
              title={RECEIPT_HERO_TITLE}
              lines={[...RECEIPT_HERO_LINES]}
              integrity={RECEIPT_HERO_INTEGRITY}
              animate="print"
            />
            <p className="mt-4 text-sm text-muted-foreground">
              {RECEIPT_HERO_CAPTION.text}{' '}
              <a
                href={RECEIPT_HERO_CAPTION.link.href}
                className="font-semibold text-foreground underline-offset-4 hover:underline"
              >
                {RECEIPT_HERO_CAPTION.link.label}
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
