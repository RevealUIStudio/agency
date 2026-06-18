import { LinkButton } from '@revealui/presentation';
import { useParams } from '@revealui/router';
import { findCaseBySlug } from '../data/cases';
import type { CaseStudy } from '../data/cases';
import { NotFoundPage } from './NotFoundPage';

const engagementLabels: Record<CaseStudy['engagementShape'], string> = {
  'fleet-trial-kit': 'Fleet Stamp',
  'custom-build': 'Custom Build',
  'ai-integration': 'AI Integration',
  composite: 'Composite engagement',
};

export function CaseStudyPage() {
  const { slug } = useParams<{ slug?: string }>();
  const study = slug ? findCaseBySlug(slug) : undefined;

  if (!study || !study.published) {
    return <NotFoundPage />;
  }

  return (
    <>
      <meta name="robots" content="index,follow" />

      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            {engagementLabels[study.engagementShape]} · {study.industry}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {study.headline}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {study.customer} · {study.timeline}
          </p>
        </div>
      </section>

      <div className="bg-muted py-16 sm:py-24">
        <div className="mx-auto max-w-3xl space-y-16 px-6">
          <section>
            <p className="text-base text-foreground">{study.summary}</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">The challenge</h2>
            <p className="mt-4 text-base text-foreground">{study.challenge}</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">What we built</h2>
            <p className="mt-4 text-base text-foreground">{study.approach}</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Outcome</h2>
            <p className="mt-4 text-base text-foreground">{study.outcome}</p>
          </section>

          {study.metrics && study.metrics.length > 0 && (
            <section>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {study.metrics.map((m) => (
                  <div key={m.label} className="rounded-lg border border-border bg-card p-6">
                    <p className="text-3xl font-bold tracking-tight text-foreground">{m.value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {study.quote && (
            <section>
              <blockquote className="border-l-4 border-primary pl-6">
                <p className="text-lg font-medium italic text-foreground">
                  &ldquo;{study.quote.text}&rdquo;
                </p>
                <footer className="mt-2 text-sm text-muted-foreground">
                  — {study.quote.attribution}
                </footer>
              </blockquote>
            </section>
          )}

          <section>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Stack we used</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {study.stack.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-card-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card p-8">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Want a similar engagement?
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              Every engagement starts with a 30-minute discovery call. If we're the right fit, we
              scope with a fixed-bid statement of work. If we're not, we'll point you somewhere
              that is.
            </p>
            <div className="mt-6">
              <LinkButton href="/contact">Schedule discovery</LinkButton>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
