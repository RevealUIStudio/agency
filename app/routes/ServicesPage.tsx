import { ServiceTeasers } from '../components/agency/ServiceTeasers';

export function ServicesPage() {
  return (
    <>
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">Services</h1>
          <p className="mt-6 text-lg text-gray-600">
            Three productized lanes for working with RevealUI Studio. Each engagement starts with
            discovery.
          </p>
        </div>
      </section>
      <ServiceTeasers />
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
            Optional paid intake
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
            Architecture Review — $3,500 fixed-bid SOW.
          </h2>
          <p className="mt-4 text-base text-gray-600">
            The optional written-assessment step before any of the three engagements above. A
            $3,500 fixed-bid SOW delivering a written architecture-review ADR at handoff — useful
            when you want an outside-eye assessment before committing to a 30-day Fleet Stamp, a
            4–12 week Custom Build, or an AI Integration sprint.
          </p>
          <div className="mt-6">
            <a
              href="/contact"
              className="inline-flex items-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-950 hover:bg-gray-50 transition-colors"
            >
              Schedule discovery →
            </a>
          </div>
        </div>
      </section>
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-sm text-gray-500">
            Looking for something else?{' '}
            <a href="/contact" className="font-semibold text-gray-950 hover:underline">
              Get in touch
            </a>{' '}
            and we'll tell you whether we're the right fit.
          </p>
        </div>
      </section>
    </>
  );
}
