/**
 * Studio blog registry.
 *
 * Bodies live next to this file as markdown. Public routes read `published`.
 * Held essays stay in the repo so the move from the product docs tree is
 * complete, and stay off /blog until a brand pass.
 *
 * Source of the move: RevealUIStudio/revealui `docs/blog/*.md` on `test`
 * (2026-09-26). Docs URLs use the filename stem. Studio URLs use `slug`.
 */

export interface BlogEntry {
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly publishedAt: string;
  readonly author: string;
  readonly file: string;
  readonly published: boolean;
  /** Present when the essay is held. Names the monorepo path still to brand-pass. */
  readonly todo?: string;
}

function held(file: string): string {
  return `Brand pass before publish. Source: RevealUIStudio/revealui docs/blog/${file}. The essay still names outside vendors, so it stays off the public index.`;
}

export const BLOG_ENTRIES: readonly BlogEntry[] = [
  {
    slug: 'open-runtime-for-fde-work',
    title: 'The open runtime for forward-deployed agent work',
    excerpt:
      'Demos die at the customer wall. Forward deployed work only finishes when the customer still owns the runtime after you leave.',
    publishedAt: '2026-07-29T18:00:00.000Z',
    author: 'Joshua Vaughn',
    file: '18-open-runtime-for-fde-work.md',
    published: true,
  },
  {
    slug: 'shareable-upside',
    title: 'I Built This So More People Could Own the Upside of AI',
    excerpt:
      'AI is splitting outcomes. I spent the longer path building a self-hosted runtime so more people could own the tools, not only rent them.',
    publishedAt: '2026-07-21T12:00:00.000Z',
    author: 'Joshua Vaughn',
    file: '17-shareable-upside.md',
    published: true,
  },
  {
    slug: 'ui-of-the-future',
    title: 'The UI of the Future Has Yet to Reveal Itself',
    excerpt:
      'The interface of the AI era is not a smarter chat window. It is your business itself, run by agents you own.',
    publishedAt: '2026-07-09T12:00:00.000Z',
    author: 'Joshua Vaughn',
    file: '16-ui-of-the-future.md',
    published: true,
  },
  {
    slug: 'dashboard-agent-chat',
    title: 'Run Your Admin by Talking to It',
    excerpt:
      'Open the admin, type what you want done, and watch the agent do it, with streaming output and full tool visibility.',
    publishedAt: '2026-06-17T12:00:00.000Z',
    author: 'Joshua Vaughn',
    file: '15-dashboard-agent-chat.md',
    published: true,
  },
  {
    slug: 'zero-regex',
    title: 'Building a Codebase With Zero Hand-Written Regex',
    excerpt:
      'We banned hand-written regular expressions across the entire fleet. Here is what we use instead, and why it makes the code safer and easier to read.',
    publishedAt: '2026-06-15T12:00:00.000Z',
    author: 'Joshua Vaughn',
    file: '13-zero-regex.md',
    published: true,
  },
  {
    slug: 'claim-drift',
    title: 'The Marketing Site That Fails CI When It Lies',
    excerpt:
      'Every number on revealui.com is checked against the code on every push. When a stat drifts from reality, the build breaks before the lie ships.',
    publishedAt: '2026-06-14T12:00:00.000Z',
    author: 'Joshua Vaughn',
    file: '14-claim-drift.md',
    published: true,
  },
  {
    slug: 'revealfleet-product-family',
    title: 'One Runtime, Eight Products: The RevealFleet Family',
    excerpt:
      'You do not adopt a framework, you adopt a fleet. RevealUI is the flagship runtime, and seven sister products extend it.',
    publishedAt: '2026-06-18T12:00:00.000Z',
    author: 'RevealUI Team',
    file: '11-revealfleet-product-family.md',
    published: false,
    todo: held('11-revealfleet-product-family.md'),
  },
  {
    slug: 'own-your-secrets',
    title: "Your Secrets Don't Belong in a .env File",
    excerpt:
      'The default bargain puts credentials in a vendor dashboard or a plaintext .env file. RevVault keeps them encrypted on hardware you control.',
    publishedAt: '2026-06-16T12:00:00.000Z',
    author: 'RevealUI Team',
    file: '12-own-your-secrets.md',
    published: false,
    todo: held('12-own-your-secrets.md'),
  },
  {
    slug: 'component-library',
    title: '68 Components, One Dependency',
    excerpt: 'A native React component library with one runtime dependency. Components you own.',
    publishedAt: '2026-06-08T12:00:00.000Z',
    author: 'RevealUI Team',
    file: '09-component-library.md',
    published: false,
    todo: held('09-component-library.md'),
  },
  {
    slug: 'own-your-data',
    title: 'Your Database, Your Storage, Your Sync',
    excerpt: 'Standard Postgres, S3-compatible storage, and real-time sync, built in and portable.',
    publishedAt: '2026-06-07T12:00:00.000Z',
    author: 'RevealUI Team',
    file: '10-own-your-data.md',
    published: false,
    todo: held('10-own-your-data.md'),
  },
  {
    slug: 'getting-started',
    title: 'From Zero to Production in About 30 Minutes',
    excerpt:
      'Build a complete business application with auth, content, and payments: from zero to deployed in about 30 minutes.',
    publishedAt: '2026-03-27T12:00:00.000Z',
    author: 'RevealUI Team',
    file: '08-getting-started.md',
    published: false,
    todo: held('08-getting-started.md'),
  },
  {
    slug: 'agent-first-future',
    title: 'Building for the Agent-First Internet',
    excerpt:
      'The web was built for browsers. The next web is being built for agents. How RevealUI is designed for both.',
    publishedAt: '2026-03-26T12:00:00.000Z',
    author: 'RevealUI Team',
    file: '07-agent-first-future.md',
    published: false,
    todo: held('07-agent-first-future.md'),
  },
  {
    slug: 'open-source-and-pro',
    title: 'Open Source + Pro: How We Think About Monetization',
    excerpt:
      'What is free, what is paid, and why. A transparent breakdown of the RevealUI business model.',
    publishedAt: '2026-03-25T12:00:00.000Z',
    author: 'RevealUI Team',
    file: '06-open-source-and-pro.md',
    published: false,
    todo: held('06-open-source-and-pro.md'),
  },
  {
    slug: 'five-primitives',
    title: 'The Five Primitives of Business Software',
    excerpt:
      'A deep technical walkthrough of People, Content, Offers, Payments, and Agents: the building blocks every software company needs.',
    publishedAt: '2026-03-24T12:00:00.000Z',
    author: 'RevealUI Team',
    file: '05-five-primitives.md',
    published: false,
    todo: held('05-five-primitives.md'),
  },
  {
    slug: 'local-first-ai-stack',
    title: 'The Air-Gap-Capable Business Runtime',
    excerpt:
      'Your secrets in your own vault, your AI running locally, your dev environment reproducible from a single command.',
    publishedAt: '2026-03-23T12:00:00.000Z',
    author: 'RevealUI Team',
    file: '04-local-first-ai-stack.md',
    published: false,
    todo: held('04-local-first-ai-stack.md'),
  },
  {
    slug: 'multi-agent-coordination',
    title: 'Three AI Agents, One Codebase, No Conflicts',
    excerpt:
      'How we coordinate multiple coding agents working on the same monorepo without stepping on each other.',
    publishedAt: '2026-03-22T12:00:00.000Z',
    author: 'RevealUI Team',
    file: '03-multi-agent-coordination.md',
    published: false,
    todo: held('03-multi-agent-coordination.md'),
  },
  {
    slug: 'http-402-payments',
    title: 'Paying for AI API Calls with HTTP 402 and USDC',
    excerpt:
      'The design for agent-native micropayments. Code-complete and dormant behind a feature flag until the billing-readiness gate clears.',
    publishedAt: '2026-03-21T12:00:00.000Z',
    author: 'RevealUI Team',
    file: '02-http-402-payments.md',
    published: false,
    todo: held('02-http-402-payments.md'),
  },
  {
    slug: 'why-we-built-revealui',
    title: 'Why I Built RevealUI',
    excerpt: 'The origin story: why another business runtime, and what makes RevealUI different.',
    publishedAt: '2026-03-20T12:00:00.000Z',
    author: 'RevealUI Team',
    file: '01-why-we-built-revealui.md',
    published: false,
    todo: held('01-why-we-built-revealui.md'),
  },
];

export function docsBlogPath(entry: BlogEntry): string {
  const stem = entry.file.endsWith('.md') ? entry.file.slice(0, -3) : entry.file;
  return `/blog/${stem}`;
}

/** Public Studio path. Held essays point at the index until they publish. */
export function studioBlogPath(entry: BlogEntry): string {
  return entry.published ? `/blog/${entry.slug}` : '/blog';
}
