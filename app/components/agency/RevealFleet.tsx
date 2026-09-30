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
          {FLEET_NAME} is the family of software behind {LEAD_PRODUCT} and the tools we use to build
          and operate it. RevealUI brings people, content, offers, payments, and agents into one
          self-hosted runtime. You can inspect the source before choosing a license.
        </p>
        <p className="mt-4 text-base text-muted-foreground">
          Studio helps you apply that foundation to an agreed workflow on your accounts. Start with
          a focused {CONSULTATION.name}, test one action with a {PILOT.name}, or implement a
          business flow with {LAUNCH.name}. Product licenses are separate.
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
