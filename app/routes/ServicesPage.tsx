import { Link } from '@revealui/router';
import { ServiceTeasers } from '@/components/agency/ServiceTeasers';
import { CONTACT_EMAIL, INTRO_CALL_URL } from '@/lib/site';

export function ServicesPage() {
  return (
    <>
      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Offers</h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Three paid offers. Use the homepage calculator, or book a 30-minute intro first. I
            invoice after we agree. There is no public checkout.
          </p>
          <p className="mt-4 text-base text-muted-foreground">
            <a
              href={INTRO_CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground hover:underline"
            >
              Book a 30-minute intro
            </a>
            {' · '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-foreground hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </section>
      <ServiceTeasers />
      <section className="bg-muted py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-sm text-muted-foreground">
            Not sure which offer?{' '}
            <Link to="/contact" className="font-semibold text-foreground hover:underline">
              Send a note
            </Link>{' '}
            or book the intro. If I am not the right fit, I will say so.
          </p>
        </div>
      </section>
    </>
  );
}
