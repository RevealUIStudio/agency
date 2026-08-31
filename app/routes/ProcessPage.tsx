import { LinkButton } from '@revealui/presentation';
import { ARCHITECTURE_ARTIFACT_BUNDLE, LAUNCH_PACKAGE, WORKING_SESSION } from '@/lib/engagements';
import { CONTACT_EMAIL, INTRO_CALL_URL, STUDIO_CITY } from '@/lib/site';

export function ProcessPage() {
  return (
    <>
      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            How we work
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Three paid offers. Every one starts with a 30-minute intro on Google Calendar. No
            account. No payment to book. Meet or sit down. If I am not the right fit, I will say so
            on the call. If we agree, I invoice. There is no checkout on this site.
          </p>
          <p className="mt-4 text-base text-muted-foreground">
            This page is how each offer actually runs: what you send, what you get back, roughly how
            long it takes, and what happens next. Product licenses live on revealui.com, not here.
          </p>
          <p className="mt-4 text-base text-muted-foreground">
            <a
              href={INTRO_CALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground hover:underline"
            >
              Book a 30-minute intro
            </a>
            {' · '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-foreground hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </section>

      <section className="bg-muted py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6 space-y-16">
          <article id={WORKING_SESSION.id}>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {WORKING_SESSION.tagline}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {WORKING_SESSION.name}. {WORKING_SESSION.price}.
            </h2>
            <p className="mt-4 text-base text-muted-foreground">{WORKING_SESSION.description}</p>
            <div className="mt-8 space-y-6 text-base leading-7 text-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground">What you send</h3>
                <p className="mt-2 text-muted-foreground">
                  The system you want to look at, and the question you want answered. That can be
                  product, runtime, receipts, a stuck live flow, or launch prep. A link is usually
                  enough. I only need account access if we cannot see the problem without it.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">What you get</h3>
                <p className="mt-2 text-muted-foreground">
                  Notes and a next step. Not a rebuild. Not ongoing support.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">How long</h3>
                <p className="mt-2 text-muted-foreground">
                  One hour. Remote, or in person in {STUDIO_CITY}. I invoice {WORKING_SESSION.price}{' '}
                  before we start. No holdback.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">What happens next</h3>
                <p className="mt-2 text-muted-foreground">
                  The hour ends. If you want {ARCHITECTURE_ARTIFACT_BUNDLE.name}, or a launch, that
                  is a separate offer and a new invoice.
                </p>
              </div>
            </div>
          </article>

          <article id={ARCHITECTURE_ARTIFACT_BUNDLE.id}>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {ARCHITECTURE_ARTIFACT_BUNDLE.tagline}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {ARCHITECTURE_ARTIFACT_BUNDLE.name}. {ARCHITECTURE_ARTIFACT_BUNDLE.price}.
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              {ARCHITECTURE_ARTIFACT_BUNDLE.description}
            </p>
            <div className="mt-8 space-y-6 text-base leading-7 text-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground">What you send</h3>
                <p className="mt-2 text-muted-foreground">
                  How the work happens today, and where the systems do not talk to each other.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">What you get</h3>
                <p className="mt-2 text-muted-foreground">
                  The architecture artifact bundle and the review. The prototype is inside the
                  artifact bundle, not a second line item. Not a live launch. No hosting. No
                  licenses.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">How long</h3>
                <p className="mt-2 text-muted-foreground">
                  We agree when the bundle lands on the intro. I start after the first half of the
                  invoice and deliver the review. Duration is that window, not a standing retainer.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">What happens next</h3>
                <p className="mt-2 text-muted-foreground">
                  {ARCHITECTURE_ARTIFACT_BUNDLE.payment} Launch is a separate offer.
                </p>
              </div>
            </div>
          </article>

          <article id={LAUNCH_PACKAGE.id}>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {LAUNCH_PACKAGE.tagline}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {LAUNCH_PACKAGE.name}. {LAUNCH_PACKAGE.price}.
            </h2>
            <p className="mt-4 text-base text-muted-foreground">{LAUNCH_PACKAGE.description}</p>
            <div className="mt-8 space-y-6 text-base leading-7 text-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground">What you send</h3>
                <p className="mt-2 text-muted-foreground">
                  Access to the accounts the work will live on. We lock the scope on the intro call:
                  one live flow on your accounts.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">What you get</h3>
                <p className="mt-2 text-muted-foreground">
                  A live handoff on your accounts. You own what we ship. You own the accounts and
                  the data. If we disappear, you still have the company. Not a multi-month platform.
                  Not an “AI” headline. Not unlimited revisions.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">How long</h3>
                <p className="mt-2 text-muted-foreground">
                  Scope is locked on the intro. This is not a multi-month platform. I start after
                  the first half of the invoice. Calendar time is the scoped piece, not an open
                  retainer.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">What happens next</h3>
                <p className="mt-2 text-muted-foreground">{LAUNCH_PACKAGE.payment}</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Book a 30-minute intro
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Google Calendar plus Meet, or sit down. No account. No payment to book. If we are not
            the right fit, I will say so on the call.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <LinkButton href={INTRO_CALL_URL} external>
              Book a 30-minute intro
            </LinkButton>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-sm font-semibold text-foreground hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
