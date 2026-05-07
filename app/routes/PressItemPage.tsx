import { Link, useParams } from '@revealui/router';
import { findPressBySlug } from '../data/press';
import type { PressItem } from '../data/press';
import { NotFoundPage } from './NotFoundPage';

const kindLabels: Record<PressItem['kind'], string> = {
  podcast: 'Podcast',
  article: 'Article',
  talk: 'Talk',
  interview: 'Interview',
  mention: 'Mention',
};

export function PressItemPage() {
  const { slug } = useParams<{ slug: string }>();
  const press = findPressBySlug(slug);

  if (!press || !press.published) {
    return <NotFoundPage />;
  }

  return (
    <>
      {press.published ? (
        <meta name="robots" content="index,follow" />
      ) : (
        <meta name="robots" content="noindex,nofollow" />
      )}

      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-xs font-medium uppercase tracking-widest text-emerald-600">
            {kindLabels[press.kind]} · {press.outlet}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">
            {press.title}
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            {new Date(press.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </section>

      <div className="bg-gray-50 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl space-y-16 px-6">
          <section>
            <p className="text-base text-gray-700">{press.summary}</p>
          </section>

          {press.pullQuote && (
            <section>
              <blockquote className="border-l-4 border-emerald-500 pl-6">
                <p className="text-lg font-medium italic text-gray-800">
                  &ldquo;{press.pullQuote.text}&rdquo;
                </p>
              </blockquote>
            </section>
          )}

          {press.topics.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold tracking-tight text-gray-950">Topics</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {press.topics.map((topic) => (
                  <li
                    key={topic}
                    className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {press.externalUrl && (
            <section className="rounded-xl border border-gray-200 bg-white p-8">
              <h2 className="text-xl font-bold tracking-tight text-gray-950">
                Read or listen at {press.outlet}
              </h2>
              <p className="mt-2 text-base text-gray-600">
                The original piece is published at {press.outlet}. The link below goes directly to
                the source.
              </p>
              <div className="mt-6">
                <a
                  href={press.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg bg-gray-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                >
                  View at {press.outlet} →
                </a>
              </div>
            </section>
          )}

          <section className="rounded-xl border border-gray-200 bg-white p-8">
            <h2 className="text-xl font-bold tracking-tight text-gray-950">
              Want to interview Joshua?
            </h2>
            <p className="mt-2 text-base text-gray-600">
              Joshua talks about RevealUI, building agent-first business systems, and operating a
              software studio as a solo founder. If you're booking guests for a podcast, panel, or
              publication, reach out.
            </p>
            <div className="mt-6">
              <Link
                to="/contact"
                className="inline-flex items-center rounded-lg bg-gray-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
              >
                Contact
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
