import { Link } from '@revealui/router';
import { publishedPress } from '../data/press';
import type { PressItem } from '../data/press';

const kindLabels: Record<PressItem['kind'], string> = {
  podcast: 'Podcast',
  article: 'Article',
  talk: 'Talk',
  interview: 'Interview',
  mention: 'Mention',
};

export function PressPage() {
  return (
    <>
      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Press</h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Public talks, podcast appearances, and press mentions from Joshua Vaughn and RevealUI
            Studio.
          </p>
        </div>
      </section>

      {publishedPress.length === 0 ? (
        <section className="bg-muted py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-6">
            <p className="text-base text-foreground">
              Joshua's public talks, podcast appearances, and press mentions appear here when they
              air or publish. Nothing scheduled at the moment. If you want to interview him about
              RevealUI Studio's work,{' '}
              <Link to="/contact" className="font-medium text-foreground underline underline-offset-2">
                reach out via the contact form
              </Link>
              .
            </p>
          </div>
        </section>
      ) : (
        <section className="bg-muted py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {publishedPress.map((item) => (
                <article
                  key={item.slug}
                  className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm"
                >
                  {item.outletLogo && (
                    <img
                      src={item.outletLogo}
                      alt={`${item.outlet} logo`}
                      className="mb-4 h-8 w-auto object-contain"
                    />
                  )}
                  <p className="text-xs font-medium uppercase tracking-widest text-primary">
                    {kindLabels[item.kind]} · {item.outlet}
                  </p>
                  <h2 className="mt-2 text-lg font-bold tracking-tight text-foreground">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {new Date(item.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="mt-4 flex-1 text-sm text-muted-foreground">{item.summary}</p>
                  <div className="mt-6 flex items-center gap-4">
                    <Link
                      to={`/press/${item.slug}`}
                      className="text-sm font-semibold text-foreground hover:underline"
                    >
                      Details →
                    </Link>
                    {item.externalUrl && (
                      <a
                        href={item.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Original →
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
