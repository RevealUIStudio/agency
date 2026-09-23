import { LinkButton } from '@revealui/presentation';
import { GUARDRAIL_BODY, GUARDRAIL_HEADING } from '@/content/guardrail';
import { CONSULTATION, LAUNCH, PROOF_SPRINT } from '@/lib/engagements';
import { CONSULTATION_BOOK_PATH, CONTACT_EMAIL, INTRO_CALL_URL, STUDIO_CITY } from '@/lib/site';

export function ProcessPage() {
  return (
    <>
      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            How we work
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Three paid offers for startups, and for technical founders and small agencies who
            already run agents. A 30-minute intro on Google Calendar stays available. No account. No
            payment to book the intro. Meet or sit down. If I am not the right fit, I will say so on
            the call. Consultation is paid when you book the slot. Proof Sprint and Launch are
            invoiced after we agree.
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
          <article id={CONSULTATION.id}>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {CONSULTATION.tagline}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {CONSULTATION.name}. {CONSULTATION.price}.
            </h2>
            <p className="mt-4 text-base text-muted-foreground">{CONSULTATION.description}</p>
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
                  Notes and a next step. No leftover site. Not a rebuild. Not ongoing support.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">How long</h3>
                <p className="mt-2 text-muted-foreground">
                  A single session. Remote, or in person in {STUDIO_CITY}. Pay {CONSULTATION.price}{' '}
                  per hour when you book the slot. No holdback.
                </p>
                <p className="mt-4">
                  <a
                    href={CONSULTATION_BOOK_PATH}
                    className="font-semibold text-foreground hover:underline"
                  >
                    Book a Consultation
                  </a>
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">What happens next</h3>
                <p className="mt-2 text-muted-foreground">
                  The session ends. If you want {PROOF_SPRINT.name} or {LAUNCH.name}, that is a
                  separate offer and a new invoice.
                </p>
              </div>
            </div>
          </article>

          <article id={PROOF_SPRINT.id}>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {PROOF_SPRINT.tagline}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {PROOF_SPRINT.name}. {PROOF_SPRINT.price}.
            </h2>
            <p className="mt-4 text-base text-muted-foreground">{PROOF_SPRINT.description}</p>
            <div className="mt-8 space-y-6 text-base leading-7 text-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground">What you send</h3>
                <p className="mt-2 text-muted-foreground">
                  Your domain, your Vercel project, your model key, and how the work happens today.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">What you get</h3>
                <p className="mt-2 text-muted-foreground">
                  One site. One receipted action you operate. Stage B is included. Your Vercel, your
                  model key. Not hosted chatbot SaaS. Product licenses live on revealui.com.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">How long</h3>
                <p className="mt-2 text-muted-foreground">
                  We agree when the site lands on the intro. I start after the invoice. Duration is
                  that window, not a standing retainer.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">What happens next</h3>
                <p className="mt-2 text-muted-foreground">
                  {PROOF_SPRINT.payment} {LAUNCH.name} is a separate offer.
                </p>
              </div>
            </div>
          </article>

          <article id={LAUNCH.id}>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {LAUNCH.tagline}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {LAUNCH.name}. {LAUNCH.price}.
            </h2>
            <p className="mt-4 text-base text-muted-foreground">{LAUNCH.description}</p>
            <div className="mt-8 space-y-6 text-base leading-7 text-foreground">
              <div>
                <h3 className="text-lg font-semibold text-foreground">What you send</h3>
                <p className="mt-2 text-muted-foreground">
                  Access to the accounts the work will live on. We lock the scope on the intro call:
                  one live flow on your accounts. Architecture work (schema, primitives, review)
                  happens inside this offer.
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
                <p className="mt-2 text-muted-foreground">{LAUNCH.payment}</p>
              </div>
            </div>
          </article>

          <aside id="guardrail-agent" className="border-t border-border pt-16">
            <h3 className="text-lg font-semibold text-foreground">{GUARDRAIL_HEADING}</h3>
            <p className="mt-2 text-base leading-7 text-muted-foreground">{GUARDRAIL_BODY}</p>
          </aside>
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
