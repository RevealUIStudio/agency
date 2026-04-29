export function PrivacyPage() {
  const lastUpdated = 'April 29, 2026';
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-gray-500">Last updated: {lastUpdated}</p>

        <div className="mt-8 space-y-6 text-base leading-7 text-gray-700">
          <p>
            REVEALUI STUDIO L.L.C. (&quot;RevealUI Studio,&quot; &quot;we,&quot; &quot;us,&quot;
            &quot;our&quot;) operates revealuistudio.com (the &quot;Site&quot;). This Privacy Policy
            describes what we collect when you visit the Site or contact us, how we use it, and
            the choices you have. The Site is informational and does not provide a software
            service or process payments. Any agency engagement we enter into with you is governed
            by a separate, signed agreement, not this Site.
          </p>

          <p>
            For privacy practices governing the open-source RevealUI platform itself
            (revealui.com, admin.revealui.com, api.revealui.com, docs.revealui.com), see the
            platform privacy policy at{' '}
            <a
              href="https://revealui.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-950 hover:underline"
            >
              revealui.com/privacy
            </a>
            .
          </p>

          <h2 className="mt-12 text-2xl font-bold text-gray-950">1. Information We Collect</h2>

          <h3 className="mt-6 text-lg font-semibold text-gray-950">Contact form submissions</h3>
          <p>
            When you submit our contact form, we collect the information you provide: your name,
            email address, an optional company name, an inquiry topic, and your message. This is
            the only first-party personal information we collect through the Site.
          </p>

          <h3 className="mt-6 text-lg font-semibold text-gray-950">Server logs</h3>
          <p>
            Our hosting provider (Vercel) records standard server logs for security and reliability:
            IP address, request path, user agent, and timestamp. We do not augment these logs with
            additional identifiers.
          </p>

          <h3 className="mt-6 text-lg font-semibold text-gray-950">What we do not collect</h3>
          <ul className="list-disc space-y-2 pl-6">
            <li>No tracking cookies, advertising cookies, or third-party analytics</li>
            <li>No fingerprinting, session replay, or behavioral profiling</li>
            <li>No data brokers, ad networks, or marketing pixels</li>
            <li>No accounts, no user credentials — the Site has no login</li>
          </ul>

          <h2 className="mt-12 text-2xl font-bold text-gray-950">2. How We Use Your Information</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>To respond to your inquiry and assess fit for an engagement</li>
            <li>To track our sales pipeline and customer relationships</li>
            <li>To detect and prevent spam, abuse, or fraudulent inquiries</li>
            <li>To comply with legal obligations</li>
          </ul>
          <p>
            We do not sell or rent personal information. We do not use your data for advertising.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-gray-950">3. Data Sharing</h2>
          <p>We share data only with the service providers necessary to operate the Site:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Vercel</strong> — Site hosting and server logs (
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-gray-950 hover:underline"
              >
                Vercel Privacy Policy
              </a>
              )
            </li>
            <li>
              <strong>Google Workspace</strong> — email correspondence at our @revealui.com
              addresses (
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-gray-950 hover:underline"
              >
                Google Privacy Policy
              </a>
              )
            </li>
          </ul>
          <p>
            We may also disclose information if compelled by law (subpoena, court order) or to
            protect our rights, property, or safety. We will tell you about any such disclosure
            unless legally prohibited.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-gray-950">4. Retention</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Contact form submissions:</strong> retained for up to 24 months for sales
              pipeline purposes. If we enter an engagement with you, related correspondence is
              retained as long as the engagement contract requires (typically 7 years for tax
              purposes).
            </li>
            <li>
              <strong>Server logs:</strong> retained per our hosting provider&apos;s policy
              (typically ≤ 90 days for Vercel).
            </li>
            <li>You may request earlier deletion at any time — see Section 5.</li>
          </ul>

          <h2 className="mt-12 text-2xl font-bold text-gray-950">5. Your Rights (GDPR / CCPA)</h2>
          <p>You have the right to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Access</strong> any personal data we hold about you
            </li>
            <li>
              <strong>Correct</strong> inaccurate data
            </li>
            <li>
              <strong>Delete</strong> your personal data
            </li>
            <li>
              <strong>Object</strong> to processing or withdraw consent
            </li>
            <li>
              <strong>Receive a copy</strong> of your data in a portable format
            </li>
          </ul>
          <p>
            To exercise any of these rights, email{' '}
            <a
              href="mailto:founder@revealui.com"
              className="font-semibold text-gray-950 hover:underline"
            >
              founder@revealui.com
            </a>
            . We will respond within 30 days.
          </p>
          <p>
            <strong>California residents</strong> have additional rights under the CCPA, including
            the right to know what personal information we collect and the right to request
            deletion. We do not sell personal information.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-gray-950">6. Security</h2>
          <p>
            All data in transit is encrypted via HTTPS / TLS. Contact form submissions are stored
            in a database access-restricted to RevealUI Studio. We use standard security practices
            including rate limiting, input validation, and least-privilege access controls. No
            system is perfect; if we become aware of a breach affecting your data, we will notify
            you in line with applicable law.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-gray-950">7. Cookies</h2>
          <p>
            The Site uses essential cookies only — currently none. We do not use tracking
            cookies, analytics cookies, or advertising cookies. If we ever introduce them, we will
            update this policy and surface a consent control.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-gray-950">8. Children</h2>
          <p>
            The Site is intended for business audiences and is not directed at children under 13.
            We do not knowingly collect personal information from children under 13.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-gray-950">9. Changes</h2>
          <p>
            We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date
            at the top reflects the most recent revision. Material changes will be reflected here;
            if we are in active correspondence with you, we will also email you about changes that
            affect your data.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-gray-950">10. Contact</h2>
          <p>
            For privacy questions or to exercise your rights, contact us at{' '}
            <a
              href="mailto:founder@revealui.com"
              className="font-semibold text-gray-950 hover:underline"
            >
              founder@revealui.com
            </a>
            .
          </p>
          <p className="text-sm text-gray-600">
            REVEALUI STUDIO L.L.C., a Tennessee single-member limited liability company.
          </p>
        </div>
      </div>
    </section>
  );
}
