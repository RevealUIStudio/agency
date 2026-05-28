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
- Zod (schema + form validation)
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

- **Domain:** `revealuistudio.com` (Deployed via Vercel)
- **Build:** `pnpm build` (Vercel auto-detects via `framework: vite`)
- **Output:** `dist/`

## Phase plan

| Phase | What ships | Status |
|---|---|---|
| **1** | Scaffold + Hero + service teasers + placeholder routes | shipped |
| **2** | Real Hero / Services / About copy, ContactForm wired to API, Privacy + Terms | shipped |
| **3** | Reusable case-study template + `/cases` and `/cases/:slug` routes; Press section (`/press`, `/press/:slug`) | template + routes shipped; first *published* case study gated on customer permission |
| **4** | Process page, blog (if/when warranted) | as needed |
| **5** | SEO polish, OG images, sitemap, structured data | ongoing |

Strategy and design decisions are coordinated internally; see the founder for context if you're contributing.

## Conventions

- **Visual identity is fully shared with RevealUI** — same Tailwind tokens (`@revealui/presentation/tokens.css`), same Geist font stack, same Cobalt brand accent — consumed from `tokens.css` and never overridden, so the site is system-adaptive (dark/light) automatically. Same team signal.
- **Cross-link to revealui.com** prominently (NavBar external link + Footer "Powered by RevealUI" badge). Customers should easily discover the OSS platform underneath.
- **No "L.L.C." in any user-facing copy** except the legal-form footer line — brand surface is `RevealUI Studio`, not `RevealUI Studio L.L.C.`.

## Origin

The agency site lives in its own repo so deploys are decoupled from the
main RevealUI monorepo CI and so the site doubles as a real external
consumer of the published `@revealui/*` npm packages.
