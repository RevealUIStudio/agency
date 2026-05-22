import { ContactForm } from '../components/agency/ContactForm';

export function ContactPage() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">Contact</h1>
        <p className="mt-6 text-lg text-gray-600">
          Tell us what you&apos;re trying to build and the engagement model you&apos;re considering
          (Fleet Stamp, Custom Build, AI Integration, Architecture Review, or migration). We respond
          within 1-2 business days.
        </p>

        <div className="mt-12">
          <ContactForm />
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <h2 className="text-lg font-semibold text-gray-950">Prefer email?</h2>
            <p className="mt-2 text-sm text-gray-600">
              Send directly to{' '}
              <a
                href="mailto:founder@revealui.com"
                className="font-semibold text-gray-950 hover:underline"
              >
                founder@revealui.com
              </a>
              . The form above just relays to the same inbox.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <h2 className="text-lg font-semibold text-gray-950">Discovery call</h2>
            <p className="mt-2 text-sm text-gray-600">
              30-minute scoping call, no commitment. Book a time that works for you:
            </p>
            <a
              href="https://cal.com/revealuistudio/discovery"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center rounded-lg bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              Book a 30-minute call →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
