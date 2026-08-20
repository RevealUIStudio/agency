import { LinkButton } from '@revealui/presentation';
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
            I work with businesses in {STUDIO_SERVICE_AREA}, and on a call. Three paid offers: a
            one-hour working session, a written plan, or a launch package. You do not need to
            understand the tech. If we are not the right fit, I will say so on the call.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <LinkButton href={INTRO_CALL_URL} external>
              Book a 30-minute intro
            </LinkButton>
            <LinkButton href="/services" appearance="outline" variant="neutral">
              See the three offers
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
        </div>
      </div>
    </section>
  );
}
