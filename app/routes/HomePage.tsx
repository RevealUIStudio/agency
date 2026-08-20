import { LinkButton } from '@revealui/presentation';
import { Hero } from '@/components/agency/Hero';
import { ServiceTeasers } from '@/components/agency/ServiceTeasers';
import { CONTACT_EMAIL, INTRO_CALL_URL } from '@/lib/site';

export function HomePage() {
  return (
    <>
      <Hero />
      <ServiceTeasers />
      <section className="bg-background py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            How it works
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Intro call, then an invoice, then the work.
          </h2>
          <ol className="mt-8 list-decimal space-y-4 pl-6 text-base text-muted-foreground">
            <li>
              Book a 30-minute intro. No account. No payment. We talk about the site, the booking
              flow, or the systems that do not talk to each other.
            </li>
            <li>
              If one of the three offers is a fit, I send an invoice. Work starts after that invoice
              (or the same day for an in-person working session).
            </li>
            <li>
              You get what we scoped: notes and a next step, a written plan, or a live site /
              booking flow you own.
            </li>
          </ol>
          <p className="mt-6 text-base text-muted-foreground">
            I do not publish client names or reviews. There are none to quote yet. If we are not the
            right fit, I will say so on the call.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <LinkButton href={INTRO_CALL_URL} external>
              Book a 30-minute intro
            </LinkButton>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-sm font-semibold text-foreground hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
