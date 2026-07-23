import { LinkButton } from '@revealui/presentation';
import { ARCHITECTURE_REVIEW, RUNTIME_METRICS } from '@/lib/engagements';

interface ProofPoint {
  metric: string;
  detail: string;
}

const proofPoints: ProofPoint[] = [
  {
    metric: 'Three engagement shapes',
    detail: `Fleet Stamp, Custom Build, AI Integration: scoped in a free 30-minute discovery call, or via a ${ARCHITECTURE_REVIEW.price} fixed-bid Architecture Review SOW when you want a written assessment first.`,
  },
  {
    metric: 'Fixed-bid statements of work',
    detail:
      'Scope is locked before work starts. Discovery call defines deliverables; fixed-bid SOW defines cost and timeline.',
  },
  {
    metric: '@revealui/router, @revealui/presentation',
    detail:
      'The RevealUI primitives that build this site, the same packages used in every engagement.',
  },
  {
    metric: `${RUNTIME_METRICS.packages} packages in the runtime monorepo`,
    detail: `${RUNTIME_METRICS.mit} MIT, forever. ${RUNTIME_METRICS.fsl} Fair Source (FSL-1.1-MIT) packages auto-convert to MIT two years after each release. Customer work inherits this license posture.`,
  },
  {
    metric: '4-12 week sprints, typical',
    detail:
      'Custom Build engagements run in defined sprints. Larger platforms are scoped per discovery, not estimated blind.',
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32 lg:py-40">
        <div className="hero-stagger max-w-3xl">
          {/*
            FDE layer copy (ADR 2026-07-21 accepted, Q4 agency-allowed).
            Product revealui.com hero is unchanged. Source: business/drafts/2026-07-21-fde-copy-pack.md §2.1
          */}
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            We build and deploy the runtime. <span className="text-primary">You keep it.</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            For teams with a working agent demo and a production-lift problem. We embed like forward
            deployed engineers, stamp a customer-owned RevealUI runtime, and hand over a system your
            people can operate.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <LinkButton href="/contact">Book a discovery call</LinkButton>
            <LinkButton
              href="https://github.com/RevealUIStudio/revealui"
              appearance="outline"
              variant="neutral"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read the runtime on GitHub
            </LinkButton>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Prefer a written assessment first?{' '}
            <a
              href="/services#architecture-review"
              className="font-semibold text-foreground underline-offset-4 hover:underline"
            >
              Start with the {ARCHITECTURE_REVIEW.price} Architecture Review
            </a>
            .
          </p>
        </div>

        <div className="mt-16 border-t border-border pt-10">
          <p className="mb-8 max-w-3xl text-base leading-7 text-muted-foreground">
            We work forward-deployed. That means we ship into your environment, model the business
            on the runtime&apos;s five primitives, wire agents as governed users, and leave you with
            a system you own. We do not rent you a dashboard you cannot move.
          </p>
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
