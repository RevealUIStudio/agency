import { LinkButton } from '@revealui/presentation';
import { ContactForm } from '@/components/agency/ContactForm';
import { CONTACT_EMAIL, DISCOVERY_CALL_URL } from '@/lib/site';

export function ContactPage() {
  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Contact</h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Tell us what you&apos;re trying to build and the engagement model you&apos;re considering
          (Fleet Stamp, Custom Build, AI Integration, Architecture Review, Launch Package, or
          migration). We respond within 1-2 business days.
        </p>

        <div className="mt-12">
          <ContactForm />
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-muted p-6">
            <h2 className="text-lg font-semibold text-foreground">Prefer email?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Send directly to{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-semibold text-foreground hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
              . The form above just relays to the same inbox.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-muted p-6">
            <h2 className="text-lg font-semibold text-foreground">Discovery call</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              30-minute scoping call, no commitment. Book a time that works for you:
            </p>
            <LinkButton href={DISCOVERY_CALL_URL} external className="mt-4">
              Book a 30-minute call →
            </LinkButton>
          </div>
        </div>
      </div>
    </section>
  );
}
