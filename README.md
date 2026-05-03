# agency

RevealUI Studio agency site. Hosted at [revealuistudio.com](https://revealuistudio.com).

This is the customer-facing site for the **agency arm** of RevealUI Studio (services, case studies, hire-us). It is a separate concern from the open-source RevealUI platform itself, which lives at [`RevealUIStudio/revealui`](https://github.com/RevealUIStudio/revealui) and is presented at [revealui.com](https://revealui.com).

## Brand surfaces

| Site | Repo | Audience | Role |
|---|---|---|---|
| revealui.com | `RevealUIStudio/revealui` (`apps/marketing`) | Engineers evaluating the OSS platform | Drive install + adoption |
| revealuistudio.com | **this repo** | B2B buyers evaluating an agency | Drive discovery calls + engagement signing |
| docs.revealui.com | `RevealUIStudio/revealui` (`apps/docs`) | Existing platform users | Reference + how-to |

## Stack

The same stack the platform itself runs on — this site is a real external consumer of the published `@revealui/*` packages, which doubles as a smoke test for the npm distribution.

- Vite + React 19 (TypeScript strict)
- Tailwind CSS v4 via `@tailwindcss/vite`
- `@revealui/router` (file-based routing)
- `@revealui/presentation` (component primitives + design tokens)
- `@revealui/core` (additional primitives)
- `@vercel/speed-insights` (analytics)
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

Vercel project pointed at this repo. `vercel.json` declares the framework + headers; deploys auto-trigger on push to `main`.

- **Domain:** `revealuistudio.com` (apex `A 76.76.21.21`, `www` CNAME `cname.vercel-dns.com`)
- **Build:** `pnpm build` (Vercel auto-detects via `framework: vite`)
- **Output:** `dist/`

## Phase plan

| Phase | What ships | Status |
|---|---|---|
| **1** | Scaffold + Hero + service teasers + placeholder routes | shipped (extracted from `RevealUIStudio/revealui` PR #658) |
| **2** | Real Hero / Services / About copy, ContactForm wired to API, Privacy + Terms | next |
| **3** | First case study (Allevia, after deal close + permission); reusable case-study template | post-Allevia |
| **4** | Process page, blog (if/when warranted) | as needed |
| **5** | SEO polish, OG images, sitemap, structured data | ongoing |

Strategy doc + design decisions live in the private coordination repo (`RevealUIStudio/revealui-jv` → `docs/agency-site-strategy.md`).

## Conventions

- **Visual identity is fully shared with RevealUI** — same Tailwind tokens (`@revealui/presentation/tokens.css`), same Geist font stack, same emerald accent. Same team signal.
- **Cross-link to revealui.com** prominently (NavBar external link + Footer "Powered by RevealUI" badge). Customers should easily discover the OSS platform underneath.
- **No "L.L.C." in any user-facing copy** except the legal-form footer line — brand surface is `RevealUI Studio`, not `RevealUI Studio L.L.C.`.

## Origin

Phase 1 scaffold was originally landed in `RevealUIStudio/revealui` as `apps/agency/` via [PR #658](https://github.com/RevealUIStudio/revealui/pull/658), then extracted to this dedicated repo on 2026-04-29 to:

1. Decouple agency-site deploy cadence from the RevealUI monorepo CI pipeline.
2. Keep customer-facing pricing, positioning, and case studies private (the OSS repo is public).
3. Dogfood the `@revealui/*` npm distribution as a real external consumer (workspace links in the monorepo papered over packaging gaps that surface here first).
