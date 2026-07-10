import { LinkButton } from '@revealui/presentation';
import { Link } from '@revealui/router';
import type { CaseStudy } from '../data/cases';
import { publishedCases } from '../data/cases';

const engagementLabels: Record<CaseStudy['engagementShape'], string> = {
  'fleet-trial-kit': 'Fleet Stamp',
  'custom-build': 'Custom Build',
  'ai-integration': 'AI Integration',
  composite: 'Composite engagement',
};

export function CasesPage() {
  return (
    <>
      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Engagements
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Every case study is published with explicit customer permission. The engagement happened
            before the case study does.
          </p>
        </div>
      </section>

      {publishedCases.length === 0 ? (
        <section className="bg-muted py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-6">
            <p className="text-base text-foreground">
              We don't publish case studies without explicit customer permission. Engagements live
              in private until our customers are ready to be named. If you'd like to talk to a
              reference customer about working with us, mention it on your discovery call.
            </p>
            <div className="mt-8">
              <LinkButton href="/contact">Schedule a discovery call</LinkButton>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-muted py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {publishedCases.map((study) => (
                <article
                  key={study.slug}
                  className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm"
                >
                  {study.customerLogo && (
                    <img
                      src={study.customerLogo}
                      alt={`${study.customer} logo`}
                      className="mb-4 h-8 w-auto object-contain"
                    />
                  )}
                  <p className="text-xs font-medium uppercase tracking-widest text-primary">
                    {engagementLabels[study.engagementShape]}
                  </p>
                  <h2 className="mt-2 text-lg font-bold tracking-tight text-foreground">
                    {study.headline}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">{study.industry}</p>
                  <p className="mt-4 flex-1 text-sm text-muted-foreground">{study.summary}</p>
                  <div className="mt-6">
                    <Link
                      to={`/cases/${study.slug}`}
                      className="text-sm font-semibold text-foreground hover:underline"
                    >
                      Read the case →
                    </Link>
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
