import { ServiceTeasers } from '@/components/agency/ServiceTeasers';

export function ServicesPage() {
  return (
    <>
      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Services
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Three productized forward-deploy lanes on the RevealUI runtime. Each engagement starts
            with discovery and ends with a system you own.
          </p>
        </div>
      </section>
      <ServiceTeasers />
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
