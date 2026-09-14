import { CONTACT_EMAIL } from '@/lib/site';

export function CookiesPage() {
  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Cookie Policy
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: September 14, 2026</p>
        <div className="mt-8 space-y-6 text-base leading-7 text-foreground">
          <p>
            revealuistudio.com is an informational site. It has no accounts and does not set
            necessary cookies. The optional tools are Vercel Speed Insights, a self-hosted Umami
            pageview tracker, and Sentry crash diagnostics. All stay off until you accept them in
            the banner. Reject is as easy as Accept. We honor Global Privacy Control and Do Not
            Track as a reject.
          </p>
          <p>
            If you accept, the site sets <code>revealui-cookie-consent</code> (first-party,
            SameSite=Lax, 180 days) so we remember the choice, then loads Speed Insights, Umami, and
            Sentry when error telemetry is configured. Umami records page views, referrer, and UTM
            campaign parameters. Sentry may send error events and, in production only, a partial
            replay of the moments before a crash. We do not record sessions continuously. We do not
            use advertising cookies or marketing pixels.
          </p>
          <p>
            This Site is informational. Do not send medical records or health information through
            the contact form.
          </p>
          <p>
            Questions:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
