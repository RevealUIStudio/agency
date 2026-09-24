import { LinkButton } from '@revealui/presentation';
import { ContactForm } from '@/components/agency/ContactForm';
import { CONSULTATION_BOOK_INTRO, STAGE_B_ADDON } from '@/lib/consultation-buyer';
import { CONSULTATION_BOOK_PATH, CONTACT_EMAIL, INTRO_CALL_URL } from '@/lib/site';

export function ContactPage() {
  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Contact</h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Book a Consultation, book a 30-minute intro, email me, or send the form. No account. No
          payment to book the intro. Consultation is paid when you book the slot. Proof Sprint and
          Launch are invoiced after we agree.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6">
          <div className="rounded-2xl border border-border bg-muted p-6">
            <h2 className="text-lg font-semibold text-foreground">Consultation</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {CONSULTATION_BOOK_INTRO} {STAGE_B_ADDON}
            </p>
            <LinkButton href={CONSULTATION_BOOK_PATH} className="mt-4">
              Book a Consultation
            </LinkButton>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-muted p-6">
              <h2 className="text-lg font-semibold text-foreground">30-minute intro</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                No account. No payment. If I am not the right fit, I will say so.
              </p>
              <LinkButton href={INTRO_CALL_URL} external className="mt-4">
                Book a 30-minute intro
              </LinkButton>
            </div>
            <div className="rounded-2xl border border-border bg-muted p-6">
              <h2 className="text-lg font-semibold text-foreground">Email</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Same inbox the form uses:{' '}
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
        </div>

        <div className="mt-16">
          <h2 className="text-xl font-bold text-foreground">Or send a note</h2>
          <p className="mt-2 text-sm text-muted-foreground">I respond within 1-2 business days.</p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
