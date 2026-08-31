import { CONTACT_EMAIL, STUDIO_CITY } from '@/lib/site';

export function AboutPage() {
  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">About</h1>
        <p className="mt-6 text-lg text-muted-foreground">
          RevealUI Studio is a product studio. I ship RevealUI, the agent runtime with receipts, and
          take paid studio work: a focused hour, an architecture artifact bundle and review, and a
          live launch. Remote first. Sitting down in {STUDIO_CITY} is available on the same
          calendar.
        </p>
        <div className="mt-12 rounded-2xl border border-border bg-muted p-8">
          <h2 className="text-xl font-bold text-foreground">Founder</h2>
          <p className="mt-3 text-card-foreground">
            <strong>Joshua Vaughn</strong>. I run the studio. If we are not the right fit, I will
            say so on the call. You do not need to understand the tech.
          </p>
          <p className="mt-3 text-card-foreground">
            Before this, 5+ years managing retail teams and operations in telecommunications, plus
            an event company and a stretch as a teacher. Not a first-time founder.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Reach out at{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-foreground hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
