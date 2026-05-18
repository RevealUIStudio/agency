import { Hero } from '../components/agency/Hero';
import { ServiceTeasers } from '../components/agency/ServiceTeasers';

export function HomePage() {
  return (
    <>
      <Hero />
      <ServiceTeasers />
      <section className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
            How we engage
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
            Discovery → scope → ship.
          </h2>
          <p className="mt-6 text-base text-gray-600">
            We start every engagement with a free 30-minute discovery call to understand the system
            you're trying to build and whether we're the right team for it. If we are, we scope with
            a fixed-bid statement of work. If you want an outside-eye written assessment before
            committing to a full engagement, that's a $3,500 fixed-bid Architecture Review SOW with
            a written architecture-review ADR at handoff. If we're not the right team, we'll point
            you somewhere that is.
          </p>
          <div className="mt-10">
            <a
              href="/contact"
              className="inline-flex items-center rounded-lg bg-gray-950 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              Schedule discovery
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
