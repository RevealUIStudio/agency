import { LinkButton } from '@revealui/presentation';
import { CONSULTATION, LAUNCH, PILOT } from '@/lib/engagements';
import { FLEET_NAME, LEAD_PRODUCT } from '@/lib/fleet';
import { PRODUCT_SITE_URL } from '@/lib/site';

export function RevealFleet() {
  return (
    <section className="border-t border-border bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          Product family
        </p>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {FLEET_NAME}
        </h2>
        <p className="mt-4 text-base text-muted-foreground">
          {FLEET_NAME} is the family name. {LEAD_PRODUCT} is the agentic business runtime. Knowledge
          Graph is part of that runtime (Electric+CRDT), not a Studio SKU. Licenses live on
          revealui.com. This page does not sell a product catalog.
        </p>
        <p className="mt-4 text-base text-muted-foreground">
          Studio work here is for startups, and for technical founders and small agencies who
          already run agents. You run it, or I ship it with you. The public menu is{' '}
          {CONSULTATION.name} at {CONSULTATION.price}, {PILOT.name} at {PILOT.price}, and{' '}
          {LAUNCH.name} at {LAUNCH.price}.
        </p>
        <div className="mt-10">
          <LinkButton href={PRODUCT_SITE_URL} external>
            {LEAD_PRODUCT} on revealui.com
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
