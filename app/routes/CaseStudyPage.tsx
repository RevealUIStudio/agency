import { Link, useParams } from '@revealui/router';
import { findCaseBySlug } from '../data/cases';
import type { CaseStudy } from '../data/cases';
import { NotFoundPage } from './NotFoundPage';

const engagementLabels: Record<CaseStudy['engagementShape'], string> = {
  'fleet-trial-kit': 'Fleet Stamp',
  'custom-build': 'Custom build',
  'ai-integration': 'AI integration',
  composite: 'Composite engagement',
};

export function CaseStudyPage() {
  const { slug } = useParams<{ slug: string }>();
  const study = findCaseBySlug(slug);

  if (!study || !study.published) {
    return <NotFoundPage />;
  }

  return (
    <>
      <meta name="robots" content="index,follow" />

      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-xs font-medium uppercase tracking-widest text-emerald-600">
            {engagementLabels[study.engagementShape]} · {study.industry}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">
            {study.headline}
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            {study.customer} · {study.timeline}
          </p>
        </div>
      </section>

      <div className="bg-gray-50 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl space-y-16 px-6">
          <section>
            <p className="text-base text-gray-700">{study.summary}</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight text-gray-950">The challenge</h2>
            <p className="mt-4 text-base text-gray-700">{study.challenge}</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight text-gray-950">What we built</h2>
            <p className="mt-4 text-base text-gray-700">{study.approach}</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight text-gray-950">Outcome</h2>
            <p className="mt-4 text-base text-gray-700">{study.outcome}</p>
          </section>

          {study.metrics && study.metrics.length > 0 && (
            <section>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {study.metrics.map((m) => (
                  <div key={m.label} className="rounded-lg border border-gray-200 bg-white p-6">
                    <p className="text-3xl font-bold tracking-tight text-gray-950">{m.value}</p>
                    <p className="mt-1 text-sm text-gray-600">{m.label}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {study.quote && (
            <section>
              <blockquote className="border-l-4 border-emerald-500 pl-6">
                <p className="text-lg font-medium italic text-gray-800">
                  &ldquo;{study.quote.text}&rdquo;
                </p>
                <footer className="mt-2 text-sm text-gray-500">
                  — {study.quote.attribution}
                </footer>
              </blockquote>
            </section>
          )}

          <section>
            <h2 className="text-2xl font-bold tracking-tight text-gray-950">Stack we used</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {study.stack.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-8">
            <h2 className="text-xl font-bold tracking-tight text-gray-950">
              Want a similar engagement?
            </h2>
            <p className="mt-2 text-base text-gray-600">
              Every engagement starts with a 30-minute discovery call. If we're the right fit, we
              scope with a fixed-bid statement of work. If we're not, we'll point you somewhere
              that is.
            </p>
            <div className="mt-6">
              <Link
                to="/contact"
                className="inline-flex items-center rounded-lg bg-gray-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
              >
                Schedule discovery
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
