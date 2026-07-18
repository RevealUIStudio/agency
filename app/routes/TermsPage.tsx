import { CONTACT_EMAIL } from '@/lib/site';

export function TermsPage() {
  const lastUpdated = 'April 29, 2026';
  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Terms of Use
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>

        <div className="mt-8 space-y-6 text-base leading-7 text-foreground">
          <p>
            These Terms of Use (&quot;Terms&quot;) govern your access to and use of
            revealuistudio.com (the &quot;Site&quot;), operated by REVEALUI STUDIO L.L.C.
            (&quot;RevealUI Studio,&quot; &quot;we,&quot; &quot;us,&quot; &quot;our&quot;), a
            Tennessee single-member limited liability company. By using the Site, you agree to these
            Terms.
          </p>

          <p>
            The Site is informational. It exists to describe our services and to let you reach out
            about a potential engagement. The Site does not provide a software service, host
            customer applications, or process payments.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-foreground">
            1. Engagement terms are separate
          </h2>
          <p>
            Nothing on the Site constitutes a binding offer or contract for professional services.
            Service tiers and prices listed on{' '}
            <a href="/services" className="font-semibold text-foreground hover:underline">
              /services
            </a>{' '}
            are starting points for scoping conversations, not standing offers. Any engagement we
            enter into is governed by a separate, signed Statement of Work or Master Services
            Agreement that supersedes the marketing copy on the Site.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-foreground">
            2. The open-source RevealUI platform is separate
          </h2>
          <p>
            The Site is distinct from the open-source RevealUI platform (revealui.com,
            admin.revealui.com, api.revealui.com, docs.revealui.com). Use of the platform is
            governed by its own terms at{' '}
            <a
              href="https://revealui.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground hover:underline"
            >
              revealui.com/terms
            </a>
            , and by the MIT and Fair Source licenses applied to its source code in the public
            repository. Those terms, not these, govern your use of the open-source software.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-foreground">3. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Use the Site for any unlawful purpose</li>
            <li>Attempt unauthorized access to the Site or its underlying infrastructure</li>
            <li>Submit spam, malware, or harmful content via the contact form</li>
            <li>Misrepresent your identity or impersonate another party</li>
            <li>Scrape or copy content for republication without permission</li>
            <li>
              Probe, scan, or test the vulnerability of the Site without prior written consent
            </li>
          </ul>
          <p>
            We reserve the right to block IPs, suspend access, or refuse to respond to inquiries
            that violate these terms.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-foreground">4. Intellectual Property</h2>
          <p>
            All content on the Site (text, design, logos, the &quot;RevealUI Studio&quot; brand) is
            the property of RevealUI Studio. The Site&apos;s source code is private. You may not
            copy or republish Site content without written permission.
          </p>
          <p>
            The open-source RevealUI platform code, hosted at{' '}
            <a
              href="https://github.com/RevealUIStudio"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground hover:underline"
            >
              github.com/RevealUIStudio
            </a>
            , is licensed under MIT (most packages) or Fair Source / FSL-1.1-MIT (the Pro packages).
            Those repository licenses are the controlling terms for the open-source code, not these
            Terms.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-foreground">5. Disclaimers</h2>
          <p>
            The Site is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We make
            no warranties, express or implied, regarding accuracy, completeness, fitness for a
            particular purpose, or non-infringement. The Site may include forward-looking statements
            about our services or roadmap; those are not guarantees.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-foreground">6. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, REVEALUI STUDIO L.L.C., its members, and its
            agents shall not be liable for any indirect, incidental, special, consequential, or
            punitive damages arising out of your use of the Site, even if advised of the possibility
            of such damages. Our total aggregate liability for any claims arising from or related to
            the Site is limited to one hundred U.S. dollars (USD $100). For engagement liabilities,
            the cap in the engagement&apos;s signed agreement controls.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-foreground">7. Indemnification</h2>
          <p>
            You agree to indemnify and hold RevealUI Studio harmless from any claim arising out of
            your misuse of the Site or your violation of these Terms.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-foreground">8. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the State of Tennessee, without regard to
            conflict-of-laws rules. Any dispute arising from your use of the Site that is not
            resolved through good-faith discussion shall be brought in the state or federal courts
            located in Knox County, Tennessee, and you consent to that jurisdiction.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-foreground">9. Changes</h2>
          <p>
            We may revise these Terms from time to time. The &quot;Last updated&quot; date at the
            top reflects the most recent revision. Continued use of the Site after a change takes
            effect constitutes acceptance of the revised Terms.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-foreground">10. Contact</h2>
          <p>
            For questions about these Terms, contact us at{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-foreground hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
          <p className="text-sm text-muted-foreground">
            REVEALUI STUDIO L.L.C., a Tennessee single-member limited liability company.
          </p>
        </div>
      </div>
    </section>
  );
}
