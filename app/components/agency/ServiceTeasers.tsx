import { LinkButton } from '@revealui/presentation';

interface ServiceTier {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  bullets: string[];
  startingAt: string;
}

const tiers: ServiceTier[] = [
  {
    slug: 'fleet-trial-kit',
    title: 'Fleet Stamp',
    tagline: 'Customer-specific RevealUI deployment',
    description:
      'A branded RevealUI Fleet deployment: your domain, your cloud, your brand, on the open-source platform we maintain. 30-day fixed-bid engagement, in early access until the public Docker images publish.',
    bullets: [
      '30-day fixed-bid delivery',
      'Branded, multi-tenant, domain-locked',
      'Self-hosted on your cloud, owned by you',
      'Early access: Loom walkthroughs until images publish',
    ],
    startingAt: 'From $25,000. Scoped in discovery.',
  },
  {
    slug: 'custom-build',
    title: 'Custom Build',
    tagline: 'Bespoke platform engagement',
    description:
      'Full custom platform engineering on the RevealUI runtime: we design, build, and ship the system your AI agents actually need.',
    bullets: [
      'Discovery + scoping',
      'TypeScript + Postgres + RevealUI primitives',
      'Stripe billing wired',
      '4-12 week sprints',
    ],
    startingAt: 'From $50,000. Fixed-bid SOW.',
  },
  {
    slug: 'ai-integration',
    title: 'AI Integration',
    tagline: 'Multi-model integration, your choice of provider',
    description:
      'We productionize the model stack you choose: Claude, OpenAI, Llama, Ollama, or whatever your team already runs. MCP server stand-up, tool design, evals, cost/latency budgets, audit integration, and a written model-selection ADR delivered at handoff.',
    bullets: [
      'Provider-agnostic delivery (Claude, OpenAI, Llama, Ollama)',
      'MCP server stand-up + tool design',
      'Evals, cost/latency budgets, audit integration',
      'Written use-case + model-selection ADR at handoff',
    ],
    startingAt: 'Fixed-bid engagement. Scoped in discovery.',
  },
];

export function ServiceTeasers() {
  return (
    <section className="bg-muted py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Productized engagements.
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Three lanes for working with RevealUI Studio. Discovery call scopes the engagement.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <article
              key={tier.slug}
              className="flex flex-col rounded-2xl border border-border bg-card p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {tier.tagline}
              </p>
              <h3 className="mt-2 text-xl font-bold text-foreground">{tier.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{tier.description}</p>
              <ul className="mt-6 flex-1 space-y-2 text-sm text-card-foreground">
                {tier.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <svg
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <title>Check</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 border-t border-border pt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {tier.startingAt}
                </p>
                <LinkButton
                  href="/contact"
                  variant="outline"
                  className="mt-4 w-full justify-center"
                >
                  Inquire
                </LinkButton>
              </div>
            </article>
          ))}
        </div>
        <aside
          id="architecture-review"
          className="mt-6 flex flex-col gap-6 rounded-2xl border border-primary/30 bg-card p-8 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Optional paid intake
            </p>
            <h3 className="mt-2 text-xl font-bold text-foreground">
              Architecture Review: $3,500 fixed-bid SOW
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              The written-assessment step before any lane above: a fixed-bid SOW delivering an
              architecture-review ADR at handoff, for teams that want an outside-eye assessment
              before committing. The $3,500 is credited toward a Fleet deployment if you proceed
              within 30 days.
            </p>
          </div>
          <LinkButton href="/contact" className="w-full justify-center sm:w-auto sm:flex-shrink-0">
            Book the Architecture Review
          </LinkButton>
        </aside>
      </div>
    </section>
  );
}
