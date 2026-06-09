import { CONTACT_EMAIL } from '../lib/site';

export function AboutPage() {
  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">About</h1>
        <p className="mt-6 text-lg text-muted-foreground">
          RevealUI Studio is a Tennessee software studio building agent-first business systems on
          the open-source RevealUI runtime. Three productized engagements: Fleet Stamp (a 30-day
          branded RevealUI Fleet deployment), Custom Build (bespoke platform engineering on the
          runtime), and AI Integration (productionizing the provider your team chose, on the
          workloads you scope). Architecture Review available as an optional paid intake.
        </p>
        <div className="mt-12 rounded-2xl border border-border bg-muted p-8">
          <h2 className="text-xl font-bold text-foreground">Founder</h2>
          {/* TODO: drop in /public/founder.jpg (square, ≥400px) and replace this block with the photo */}
          <p className="mt-3 text-card-foreground">
            <strong>Joshua Vaughn</strong>, full-stack engineer and founder of RevealUI Studio,
            operating from Maryville, Tennessee. Built the open-source RevealUI platform (26
            packages, 2,400+ commits) before standing up the agency arm.
          </p>
          <p className="mt-3 text-card-foreground">
            Before this, ten years managing teams and operations in telecommunications across the
            full revenue cycle, plus an event company and a stretch as a teacher. The teaching
            background shows up in how the work gets framed: explain the system, show the system,
            hand over the system. Not a first-time founder.
          </p>
          <p className="mt-3 text-card-foreground">
            The studio is built on a structural commitment: every engagement runs on the same
            open-source RevealUI software anyone can install themselves. No private agency layer,
            no "consulting code" you can't audit. If a tool isn't strong enough for an OSS user to
            ship to production, it's not strong enough to deploy at yours.
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
        <div className="mt-12">
          <h2 className="text-xl font-bold text-foreground">What we build with</h2>
          <p className="mt-3 text-muted-foreground">
            Every engagement draws from the RevFleet toolset. We use these primitives daily, so
            when a customer asks why something works a particular way, the answer is always the
            same: we built it, we run it, we maintain it.
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-2 text-sm text-foreground sm:grid-cols-2">
            <li>
              <strong>RevealUI</strong>: agent-first business runtime powering every engagement
            </li>
            <li>
              <strong>RevVault</strong>: age-encrypted secret vault used on every engagement
            </li>
            <li>
              <strong>RevDev</strong>: native developer tools (Studio + Console + harness daemon)
            </li>
            <li>
              <strong>RevSkills</strong>: Claude Code skills library
            </li>
            <li>
              <strong>RevKit</strong>: portable WSL developer environment
            </li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Most of RevFleet ships under MIT or Fair Source (FSL-1.1-MIT).{' '}
            <a
              href="https://revealui.com/products"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground hover:underline"
            >
              Browse the full product catalog →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
