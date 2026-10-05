import { LinkButton, ReceiptCard } from '@revealui/presentation';
import {
  RECEIPT_HERO_CAPTION,
  RECEIPT_HERO_INTEGRITY,
  RECEIPT_HERO_LINES,
  RECEIPT_HERO_TITLE,
} from '@/content/receipt';
import { ADAPTER, CONSULTATION, LAUNCH, PILOT, STAGE_B_PRICE } from '@/lib/engagements';
import { CONTACT_EMAIL, INTRO_CALL_URL } from '@/lib/site';

/** Visible H1. Known-for lock: agentic business runtime they operate on their domain. */
export const HERO_HEADLINE = 'Build a business workflow your team can operate.' as const;

/** Document title / OG title. Same known-for sentence as the H1, without the period. */
export const HOME_DOCUMENT_TITLE =
  'RevealUI Studio | Build a business workflow your team can operate' as const;

/**
 * Home meta / OG / Twitter description. Known-for H1 + proof subline + ladder.
 * Pain is not the document title. Proof stays out of the H1.
 */
export const HOME_META_DESCRIPTION =
  'Work with Joshua Vaughn to review, test, or launch a RevealUI business flow on your accounts. Book a free 30-minute intro with RevealUI Studio.' as const;

/** Meta-only known-for proof line. Visible hero breath is pain → result → menu → PROOF. */
export const HERO_SUBLINE =
  'I help technical founders and small agencies review, test, and launch RevealUI workflows on their own accounts.' as const;

/** Pain. Promoted above prices. Not the H1. */
export const HERO_SHOP_LINE =
  'I help technical founders and small agencies review, test, and launch RevealUI workflows on their own accounts.' as const;

export const HERO_RESULT =
  'Work directly with Joshua Vaughn, the founder and builder of RevealUI. We agree on scope, deliverables, and maintenance responsibilities before work starts.' as const;

export const HERO_MENU =
  `${CONSULTATION.name} ${CONSULTATION.price} · ${PILOT.name} ${PILOT.price} (includes 1 Adapter) · ${LAUNCH.name} ${LAUNCH.price} (up to 3 Adapters) · ${ADAPTER.name} ${ADAPTER.price} · Domain add-on ${STAGE_B_PRICE}.` as const;

export const HERO_PROOF = RECEIPT_HERO_CAPTION.text;

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
          <p className="mt-6 text-lg leading-8 text-muted-foreground">{HERO_SHOP_LINE}</p>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">{HERO_RESULT}</p>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">{HERO_PROOF}</p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <LinkButton href={INTRO_CALL_URL} external>
              Book a free 30-minute intro
            </LinkButton>
            <LinkButton href="/#calculator" appearance="outline" variant="neutral">
              Find your starting point
            </LinkButton>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            The intro is free. Consultation is paid when you book. Pilot and Launch are invoiced
            after we agree on scope.{' '}
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
