import { LinkButton } from '@revealui/presentation';
import { Hero } from '@/components/agency/Hero';
import { ServiceTeasers } from '@/components/agency/ServiceTeasers';
import { ARCHITECTURE_REVIEW, LAUNCH_PACKAGE } from '@/lib/engagements';
import { DISCOVERY_CALL_URL } from '@/lib/site';

export function HomePage() {
  return (
    <>
      <Hero />
      <ServiceTeasers />
      <section className="bg-background py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            How we engage
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Discovery → scope → ship.
          </h2>
          <p className="mt-6 text-base text-muted-foreground">
            We start every engagement with a free 30-minute discovery call to understand the system
            you're trying to build and whether we're the right team for it. If we are, we scope with
            a fixed-bid statement of work. If you want an outside-eye written assessment before
            committing to a full engagement, that is a {ARCHITECTURE_REVIEW.price} fixed-bid{' '}
            {ARCHITECTURE_REVIEW.name} SOW with a written architecture-review ADR at handoff,
            credited toward a Fleet deployment if you proceed within 30 days. Prefer a faster path
            to a live instance? The {LAUNCH_PACKAGE.price} {LAUNCH_PACKAGE.name} configures,
            deploys, and hands over production in two to four weeks. If we're not the right team,
            we'll point you somewhere that is.
          </p>
          <div className="mt-10">
            <LinkButton href={DISCOVERY_CALL_URL} external>
              Schedule discovery
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
