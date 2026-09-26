# agency

RevealUI Studio agency site. Hosted at [revealuistudio.com](https://revealuistudio.com).

This is the customer-facing site for the **agency arm** of RevealUI Studio (services, case studies, hire-us). It is a separate concern from the open-source RevealUI platform itself, which lives at [`RevealUIStudio/revealui`](https://github.com/RevealUIStudio/revealui) and is presented at [revealui.com](https://revealui.com).

## Brand surfaces

| Site | Repo | Audience | Role |
|---|---|---|---|
| revealui.com | `RevealUIStudio/revealui` (`apps/marketing`) | Engineers evaluating the OSS platform | Drive install + adoption |
| revealuistudio.com | **this repo** | Teams evaluating the product studio | Drive a 30-minute intro, one of three paid offers, and the studio blog |
| docs.revealui.com | `RevealUIStudio/revealui` (`apps/docs`) | Existing platform users | Product reference only. Blog is on Studio. Docs are product reference. |

## Stack

The same stack the platform itself runs on — this site is a real external consumer of the published `@revealui/*` packages, which doubles as a smoke test for the npm distribution.

- Vite + React 19 (TypeScript strict)
- Tailwind CSS v4 via `@tailwindcss/vite`
- `@revealui/router` (SPA routing via programmatic route registration in `app/App.tsx`)
- `@revealui/presentation` (component primitives + design tokens)
- `@revealui/contracts` (Track D Launch price; Consultation and Pilot are studio-only)
- Zod (schema + form validation)
- `@vercel/speed-insights` (consented performance)
- Self-hosted Umami (consented pageviews / UTM)
- `@sentry/react` (consented crash tracing / on-error replay; no-op without `VITE_SENTRY_DSN`)
- Vitest

## Development

```bash
pnpm install
pnpm dev          # http://localhost:3001
pnpm typecheck
pnpm test
```

## Build

```bash
pnpm build        # → dist/
pnpm preview      # serves dist/ on :3001
```

## Deploy

Vercel project pointed at this repo. `vercel.json` declares the framework + headers. Deploys run on `main` and `test` only; other refs are skipped by `scripts/vercel-ignored-build-step.mjs`.

- **Domain:** `revealuistudio.com` (Deployed via Vercel)
- **Build:** `pnpm build` (Vercel auto-detects via `framework: vite`)
- **Output:** `dist/`

## Analytics

Optional, consent-gated. After Accept, the site loads Vercel Speed Insights, the self-hosted Umami tracker (`script.js` with `data-website-id`), and the Sentry browser SDK when `VITE_SENTRY_DSN` is set. Umami records page views, referrer, and UTM query params via History API navigations. Sentry tracing and on-error replay stay at sample rate 0 until Accept *and* a production build; there is no proactive session recording. None of these tools load on Reject or before a choice. Do not add `@vercel/analytics`.

Set these **build-time** variables on the Vercel project for `test` and production. They are not required locally — each sink no-ops when its variable is missing. Do not commit a real Sentry DSN; paste it in Vercel only (org `revealui-studio-llc`, separate agency project preferred).

```bash
VITE_UMAMI_URL=https://revealui-umami.fly.dev
VITE_UMAMI_WEBSITE_ID=0fbf4090-7768-47f8-9f85-5ab24a822160
# VITE_SENTRY_DSN — paste the agency Sentry project DSN in Vercel only; omit locally.
```

`vercel.json` CSP allows `script-src` and `connect-src` for `https://revealui-umami.fly.dev`, and `connect-src` for `https://*.ingest.sentry.io` and `https://*.ingest.us.sentry.io`.

## Phase plan

| Phase | What ships | Status |
|---|---|---|
| **1** | Scaffold + Hero + service teasers + placeholder routes | shipped |
| **2** | Real Hero / Services / About copy, ContactForm wired to API (`POST /api/contact`, `source: 'agency'`), Privacy + Terms | shipped |
| **3** | Reusable case-study template + `/cases` and `/cases/:slug` routes; Press section (`/press`, `/press/:slug`) | template + routes shipped; `publishedCases` / `publishedPress` empty until customer-approved content is added |
| **4** | Process page, blog | `/process` and `/blog` shipped. Held essays stay in `content/blog` until a brand pass. See `docs/BLOG-CUTOVER.md`. |
| **5** | SEO | mostly shipped: `index.html` OG/Twitter cards, Organization JSON-LD, `public/sitemap.xml`, `public/robots.txt`; residual polish as needed |

Strategy and design decisions are coordinated internally; see the founder for context if you're contributing.

## Conventions

- **Visual identity shares Cobalt tokens with RevealUI** — Tailwind tokens from `@revealui/presentation/tokens.css`, never overridden, so the site is system-adaptive (dark/light) automatically. **Typeface:** this site uses Geist / Geist Mono; the product marketing site on revealui.com uses Inter / Inter Tight / JetBrains Mono. Tokens and brand accent stay shared; fonts may diverge deliberately.
- **Public site is a product-studio homepage plus the three-question calculator.** Defaults to "You will" (Studio). Consultation $300, Pilot $3,997 (includes 1 Adapter), Launch $14,500 (up to 3 Adapters). Adapter $2,497 is an add-on (extras, or while on Care) and is not sold alone. Stage B is $297 after Consultation alone and included at Pilot and Launch. They operate, or they pay to implement. Self-host hops to revealui.com (start free) with no product SKUs. Do not add Fleet / stamp / kit SKUs, $25k / $50k, or third-party booking hosts. The open-source product lives at revealui.com.
- **No "L.L.C." in any user-facing copy** except the legal-form footer line — brand surface is `RevealUI Studio`, not `RevealUI Studio L.L.C.`.

## Origin

The agency site lives in its own repo so deploys are decoupled from the
main RevealUI monorepo CI and so the site doubles as a real external
consumer of the published `@revealui/*` npm packages.
