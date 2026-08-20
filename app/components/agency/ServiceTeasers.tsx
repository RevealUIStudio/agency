import { IconCheck, LinkButton } from '@revealui/presentation';
import { PUBLIC_OFFERS } from '@/lib/engagements';
import { INTRO_CALL_URL } from '@/lib/site';

export function ServiceTeasers() {
  return (
    <section className="bg-muted py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Three offers.
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            That is the public menu. Invoice after we book. There is no checkout button on this
            site.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {PUBLIC_OFFERS.map((offer) => (
            <article
              key={offer.id}
              id={offer.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-8 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {offer.tagline}
              </p>
              <h3 className="mt-2 text-xl font-bold text-foreground">{offer.name}</h3>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {offer.price}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">{offer.description}</p>
              <ul className="mt-6 flex-1 space-y-2 text-sm text-card-foreground">
                {offer.includes.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <IconCheck className="mt-0.5 flex-shrink-0 text-primary" size="sm" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">Payment. </span>
                  {offer.payment}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Not included. </span>
                  {offer.notIncluded.join('; ')}.
                </p>
              </div>
              <div className="mt-8 border-t border-border pt-6">
                <LinkButton
                  href={INTRO_CALL_URL}
                  external
                  appearance="outline"
                  variant="neutral"
                  className="w-full justify-center"
                >
                  Book a 30-minute intro
                </LinkButton>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
