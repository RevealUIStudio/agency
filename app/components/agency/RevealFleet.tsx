import { LinkButton } from '@revealui/presentation';
import { LAUNCH_PACKAGE, WORKING_SESSION, WRITTEN_PLAN } from '@/lib/engagements';
import { FLEET_NAME, LEAD_PRODUCT, PRODUCT_CATALOG, REVVAULT_ROLE } from '@/lib/fleet';
import { PRODUCT_SITE_URL } from '@/lib/site';

export function RevealFleet() {
  return (
    <section className="border-t border-border bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Product family</p>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {FLEET_NAME}
        </h2>
        <p className="mt-4 text-base text-muted-foreground">
          RevealUI Studio ships {FLEET_NAME}. {LEAD_PRODUCT} is the lead product. It is the agent
          runtime with receipts, and you can buy it on revealui.com.
        </p>
        <p className="mt-4 text-base text-muted-foreground">
          The catalog is {PRODUCT_CATALOG.free}, Pro at {PRODUCT_CATALOG.pro}, Max at{' '}
          {PRODUCT_CATALOG.max}, and Enterprise by inquiry. {REVVAULT_ROLE}
        </p>
        <p className="mt-4 text-base text-muted-foreground">
          Studio work stays the commercial offer on this site. The public menu is an hour at{' '}
          {WORKING_SESSION.price}, the {WRITTEN_PLAN.name} at {WRITTEN_PLAN.price} with the
          prototype inside the bundle, and Launch at {LAUNCH_PACKAGE.price}.
        </p>
        <div className="mt-10">
          <LinkButton href={PRODUCT_SITE_URL} external>
            Buy {LEAD_PRODUCT}
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
