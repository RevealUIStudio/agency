import { LinkButton } from '@revealui/presentation';
import {
  AI_INTEGRATION,
  ARCHITECTURE_REVIEW,
  CUSTOM_BUILD,
  engagementPriceDisplay,
  FLEET_STAMP,
  LAUNCH_PACKAGE,
} from '@/lib/engagements';

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
    title: FLEET_STAMP.name,
    // FDE gloss: business/drafts/2026-07-21-fde-copy-pack.md §2.3
    tagline: 'Productized forward deploy',
    description:
      'Branded, customer-owned RevealUI runtime in a fixed window: your domain, your cloud, your brand. 30-day fixed-bid engagement, in early access until the public Docker images publish.',
    bullets: [
      '30-day fixed-bid delivery',
      'Branded, multi-tenant, domain-locked',
      'Self-hosted on your cloud, owned by you',
      'Early access: Loom walkthroughs until images publish',
    ],
    startingAt: engagementPriceDisplay(FLEET_STAMP),
  },
  {
    slug: 'custom-build',
    title: CUSTOM_BUILD.name,
    tagline: 'Deep embed when stamp shape is not enough',
    description:
      'Full custom platform engineering on the RevealUI runtime when integrations, unusual tenancy, or migration need more than a stamp. We design, build, and hand over the system your agents run on.',
    bullets: [
      'Discovery + scoping',
      'TypeScript + Postgres + RevealUI primitives',
      'Stripe billing wired',
      '4-12 week sprints',
    ],
    startingAt: `From ${CUSTOM_BUILD.price}. Fixed-bid SOW.`,
  },
  {
    slug: 'ai-integration',
    title: AI_INTEGRATION.name,
    tagline: 'Productionize your provider on named workloads',
    description:
      'We productionize the model stack you choose: Claude, OpenAI, Llama, Ollama, or whatever your team already runs. MCP server stand-up, tool design, evals, cost and latency budgets, audit integration, and a written model-selection ADR at handoff.',
    bullets: [
      'Provider-agnostic delivery (Claude, OpenAI, Llama, Ollama)',
      'MCP server stand-up + tool design',
      'Evals, cost/latency budgets, audit integration',
      'Written use-case + model-selection ADR at handoff',
    ],
    startingAt: engagementPriceDisplay(AI_INTEGRATION),
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
            Three productized forward-deploy lanes, plus fixed-bid intake when you want a written
            plan before a full build. Discovery scopes the engagement; handoff leaves you operating
            the runtime without our laptops.
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
                  appearance="outline"
                  variant="neutral"
                  className="mt-4 w-full justify-center"
                >
                  Inquire
                </LinkButton>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <aside
            id="architecture-review"
            className="flex flex-col gap-6 rounded-2xl border border-primary/30 bg-card p-8 shadow-sm"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Optional paid intake
              </p>
              <h3 className="mt-2 text-xl font-bold text-foreground">
                {ARCHITECTURE_REVIEW.name}: {ARCHITECTURE_REVIEW.price} fixed-bid SOW
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Scoped embed: map your domain onto the five primitives and name the risks before a
                build. Fixed-bid SOW delivering an architecture-review ADR at handoff. The{' '}
                {ARCHITECTURE_REVIEW.price} is credited toward a Fleet deployment if you proceed
                within 30 days.
              </p>
            </div>
            <LinkButton href="/contact" className="w-full justify-center sm:w-auto sm:self-start">
              Book the Architecture Review
            </LinkButton>
          </aside>

          <aside
            id="launch-package"
            className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-8 shadow-sm"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Optional paid intake
              </p>
              <h3 className="mt-2 text-xl font-bold text-foreground">
                {LAUNCH_PACKAGE.name}: {LAUNCH_PACKAGE.price} fixed-bid SOW
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Fixed-bid setup, live in two to four weeks: we configure your RevealUI instance,
                deploy it to production, and hand you the keys with a full handoff session. The
                fastest path from a signed engagement to a live product you operate yourself.
              </p>
            </div>
            <LinkButton
              href="/contact"
              appearance="outline"
              variant="neutral"
              className="w-full justify-center sm:w-auto sm:self-start"
            >
              Book the Launch Package
            </LinkButton>
          </aside>
        </div>
      </div>
    </section>
  );
}
