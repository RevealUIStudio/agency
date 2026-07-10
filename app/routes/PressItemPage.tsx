import { LinkButton } from '@revealui/presentation';
import { useParams } from '@revealui/router';
import type { PressItem } from '../data/press';
import { findPressBySlug } from '../data/press';
import { formatPressDate } from '../lib/format';
import { NotFoundPage } from './NotFoundPage';

const kindLabels: Record<PressItem['kind'], string> = {
  podcast: 'Podcast',
  article: 'Article',
  talk: 'Talk',
  interview: 'Interview',
  mention: 'Mention',
};

export function PressItemPage() {
  const { slug } = useParams<{ slug?: string }>();
  const press = slug ? findPressBySlug(slug) : undefined;

  if (!press || !press.published) {
    return <NotFoundPage />;
  }

  return (
    <>
      <meta name="robots" content="index,follow" />

      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            {kindLabels[press.kind]} · {press.outlet}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {press.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{formatPressDate(press.date)}</p>
        </div>
      </section>

      <div className="bg-muted py-16 sm:py-24">
        <div className="mx-auto max-w-3xl space-y-16 px-6">
          <section>
            <p className="text-base text-foreground">{press.summary}</p>
          </section>

          {press.pullQuote && (
            <section>
              <blockquote className="border-l-4 border-primary pl-6">
                <p className="text-lg font-medium italic text-foreground">
                  &ldquo;{press.pullQuote.text}&rdquo;
                </p>
              </blockquote>
            </section>
          )}

          {press.topics.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Topics</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {press.topics.map((topic) => (
                  <li
                    key={topic}
                    className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-card-foreground"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {press.externalUrl && (
            <section className="rounded-xl border border-border bg-card p-8">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Read or listen at {press.outlet}
              </h2>
              <p className="mt-2 text-base text-muted-foreground">
                The original piece is published at {press.outlet}. The link below goes directly to
                the source.
              </p>
              <div className="mt-6">
                <LinkButton href={press.externalUrl} external>
                  View at {press.outlet} →
                </LinkButton>
              </div>
            </section>
          )}

          <section className="rounded-xl border border-border bg-card p-8">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Want to interview Joshua?
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              Joshua talks about RevealUI, building agent-first business systems, and operating a
              software studio as a solo founder. If you're booking guests for a podcast, panel, or
              publication, reach out.
            </p>
            <div className="mt-6">
              <LinkButton href="/contact">Contact</LinkButton>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
