export function AboutPage() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="text-4xl font-bold tracking-tight text-gray-950 sm:text-5xl">About</h1>
        <p className="mt-6 text-lg text-gray-600">
          RevealUI Studio is a Tennessee software studio building agent-first business systems on
          the open-source RevealUI runtime. We sell two things: branded RevealUI Fleet deployments
          for customers who want a managed instance, and bespoke engineering engagements for teams
          building something custom.
        </p>
        <div className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 p-8">
          <h2 className="text-xl font-bold text-gray-950">Founder</h2>
          {/* TODO: drop in /public/founder.jpg (square, ≥400px) and replace this block with the photo */}
          <p className="mt-3 text-gray-700">
            <strong>Joshua Vaughn</strong> — full-stack engineer and founder of RevealUI Studio,
            operating from Maryville, Tennessee. Built the open-source RevealUI platform (26
            packages, 2,400+ commits) before standing up the agency arm.
          </p>
          <p className="mt-3 text-gray-700">
            Before this, ten years managing teams and operations in telecommunications across the
            full revenue cycle, plus an event company and a stretch as a teacher. The teaching
            background shows up in how the work gets framed: explain the system, show the system,
            hand over the system. Not a first-time founder.
          </p>
          <p className="mt-3 text-gray-700">
            The studio is built on a structural commitment: every engagement runs on the same
            open-source RevealUI software anyone can install themselves. No private agency layer,
            no "consulting code" you can't audit. If a tool isn't strong enough for an OSS user to
            ship to production, it's not strong enough to deploy at yours.
          </p>
          <p className="mt-4 text-sm text-gray-600">
            Reach out at{' '}
            <a
              href="mailto:founder@revealui.com"
              className="font-semibold text-gray-950 hover:underline"
            >
              founder@revealui.com
            </a>
            .
          </p>
        </div>
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-950">What we build with</h2>
          <p className="mt-3 text-gray-600">
            Every engagement draws from the RevFleet toolset. We use these primitives daily — so
            when a customer asks why something works a particular way, the answer is always the
            same: we built it, we run it, we maintain it.
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
            <li>
              <strong>RevealUI</strong> — agent-first business runtime powering every engagement
            </li>
            <li>
              <strong>RevVault</strong> — zero-plaintext secrets management
            </li>
            <li>
              <strong>Enterprise</strong> — SaaS billing tier for self-hosted Fleet deployments
            </li>
            <li>
              <strong>RevealCoin</strong> — Solana token infrastructure
            </li>
            <li>
              <strong>RevCon</strong> — portable editor configuration layer
            </li>
            <li>
              <strong>RevDev</strong> — agent runtime and inter-agent coordination
            </li>
            <li>
              <strong>RevSkills</strong> — Claude Code skills library
            </li>
            <li>
              <strong>RevKit</strong> — portable WSL developer environment
            </li>
          </ul>
          <p className="mt-4 text-sm text-gray-500">
            Most of RevFleet ships under MIT or Fair Source (FSL-1.1-MIT).{' '}
            <a
              href="https://revealui.com/products"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-950 hover:underline"
            >
              Browse the full product catalog →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
