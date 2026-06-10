import { ServiceTeasers } from '../components/agency/ServiceTeasers';
import { DISCOVERY_CALL_URL } from '../lib/site';

export function ServicesPage() {
  return (
    <>
      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Services</h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Three productized lanes for working with RevealUI Studio. Each engagement starts with
            discovery.
          </p>
        </div>
      </section>
      <ServiceTeasers />
      <section className="bg-background py-16">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Optional paid intake
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Architecture Review: $3,500 fixed-bid SOW.
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            The optional written-assessment step before any of the three engagements above. A
            $3,500 fixed-bid SOW delivering a written architecture-review ADR at handoff, useful
            when you want an outside-eye assessment before committing to a 30-day Fleet Stamp, a
            4–12 week Custom Build, or an AI Integration sprint. The $3,500 is credited toward a
            Fleet deployment if you proceed within 30 days.
          </p>
          <div className="mt-6">
            <a
              href={DISCOVERY_CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Schedule discovery →
            </a>
          </div>
        </div>
      </section>
      <section className="bg-muted py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-sm text-muted-foreground">
            Looking for something else?{' '}
            <a href="/contact" className="font-semibold text-foreground hover:underline">
              Get in touch
            </a>{' '}
            and we'll tell you whether we're the right fit.
          </p>
        </div>
      </section>
    </>
  );
}
