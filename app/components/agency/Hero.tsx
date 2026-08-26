import { LinkButton, ReceiptCard } from '@revealui/presentation';
import {
  RECEIPT_HERO_CAPTION,
  RECEIPT_HERO_INTEGRITY,
  RECEIPT_HERO_LINES,
  RECEIPT_HERO_TITLE,
} from '@/content/receipt';
import { CONTACT_EMAIL, INTRO_CALL_URL, STUDIO_SERVICE_AREA } from '@/lib/site';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32 lg:py-40">
        <div className="hero-stagger max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            RevealUI Studio · Maryville, Tennessee
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            A local studio for a site, a booking flow, or a written plan.
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            I work with businesses in {STUDIO_SERVICE_AREA}, and on a call. Answer three questions
            for a quote, or book a 30-minute intro. You do not need to understand the tech.
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
