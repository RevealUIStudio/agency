import { Link } from '@revealui/router';

interface ProofPoint {
  metric: string;
  detail: string;
}

const proofPoints: ProofPoint[] = [
  {
    metric: 'Three engagement shapes',
    detail:
      'Fleet Stamp, Custom Build, AI Integration — scoped in a free 30-minute discovery call, or via a $3,500 fixed-bid Architecture Review SOW when you want a written assessment first.',
  },
  {
    metric: 'Fixed-bid statements of work',
    detail:
      'Scope is locked before work starts. Discovery call defines deliverables; fixed-bid SOW defines cost and timeline.',
  },
  {
    metric: '@revealui/core, @revealui/router, @revealui/presentation',
    detail:
      'The three RevealUI primitives used in every engagement — the same packages that build this site.',
  },
  {
    metric: '26 packages on npm',
    detail:
      '20 MIT — forever. 5 Pro packages are Fair Source (FSL-1.1-MIT) and auto-convert to MIT two years after each release. Customer work inherits this license posture.',
  },
  {
    metric: '4–12 week sprints, typical',
    detail:
      'Custom Build engagements run in defined sprints. Larger platforms are scoped per discovery — not estimated blind.',
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32 lg:py-40">
        <div className="hero-stagger max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            We build agent-first business systems with{' '}
            <span className="text-primary">RevealUI</span>.
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            RevealUI Studio is the agency that builds and integrates with the open-source RevealUI
            runtime — for engineering teams shipping real AI products. We start where the tutorial
            ends.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Book a discovery call
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              View services →
            </Link>
          </div>
        </div>

        <div className="mt-16 border-t border-border pt-10">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-6">
            How engagements work
          </h2>
          <ul className="grid grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-3 list-none">
            {proofPoints.map((point) => (
              <li key={point.metric} className="flex gap-3">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-foreground">{point.metric}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{point.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
