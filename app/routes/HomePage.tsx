import { LinkButton } from '@revealui/presentation';
import { useLocation } from '@revealui/router';
import { useEffect } from 'react';
import { Hero } from '@/components/agency/Hero';
import { ProductCatalog } from '@/components/agency/ProductCatalog';
import { QuoteCalculator } from '@/components/agency/QuoteCalculator';
import { CONTACT_EMAIL, INTRO_CALL_URL } from '@/lib/site';

export function HomePage() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash !== '#calculator') return;
    document.getElementById('calculator')?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <>
      <Hero />
      <ProductCatalog />
      <QuoteCalculator />
      <section className="bg-background py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Book a 30-minute intro
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Google Calendar plus Meet, or sit down. No account. No payment to book. If we are not
            the right fit, I will say so on the call.
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
