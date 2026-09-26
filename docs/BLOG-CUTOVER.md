# Blog cutover (2026-09-26)

Joshua locked the IA: the blog lives on RevealUI Studio (`revealuistudio.com`, this repo). `docs.revealui.com` stays product reference only. This file is the inventory and the redirect list for FDE. Do not promote this branch to `main` until Joshua says the brand pass is done.

## Inventory

| Surface | What exists today | After this change |
|---|---|---|
| Agency (`revealuistudio.com`) | No blog routes before this branch | `/blog` and `/blog/:slug`. Published essays render. Held essays 404. |
| Product docs (`docs.revealui.com`) | `apps/docs` sidebar section titled Blog. Posts are served from `docs/blog/*.md` at `/blog/<filename-stem>`. | Still the old home until the docs repo drops that sidebar section and adds the redirects below. This PR does not edit that repo. |
| Product marketing (`revealui.com`) | `apps/marketing` serves the same essays at `/blog` and `/blog/<slug>`. | Still a second home until that app redirects to Studio. Not a docs URL. Listed below so cutover does not leave it up. |

Bodies now live in `content/blog/*.md`. The registry is `content/blog/registry.ts`.

Published on Studio (house style pass already applied: Pilot, no em dashes, no outside vendor names, founder bio matches the About page):

- `18-open-runtime-for-fde-work.md`
- `17-shareable-upside.md`
- `16-ui-of-the-future.md`
- `15-dashboard-agent-chat.md`
- `14-claim-drift.md`
- `13-zero-regex.md`

Held in `content/blog` until a brand pass. Each `todo` names `RevealUIStudio/revealui docs/blog/<file>`. They still name outside vendors, so they are not linked from `/blog` and they are not in the sitemap.

## Required redirects (docs host to Studio)

Configure these on the docs project (`RevealUIStudio/revealui`, `apps/docs`), not in this repo. This repo cannot redirect `docs.revealui.com`.

Permanent (301). Destination is the Studio URL.

| Old docs URL | New Studio URL |
|---|---|
| `https://docs.revealui.com/blog/18-open-runtime-for-fde-work` | `https://revealuistudio.com/blog/open-runtime-for-fde-work` |
| `https://docs.revealui.com/blog/17-shareable-upside` | `https://revealuistudio.com/blog/shareable-upside` |
| `https://docs.revealui.com/blog/16-ui-of-the-future` | `https://revealuistudio.com/blog/ui-of-the-future` |
| `https://docs.revealui.com/blog/15-dashboard-agent-chat` | `https://revealuistudio.com/blog/dashboard-agent-chat` |
| `https://docs.revealui.com/blog/14-claim-drift` | `https://revealuistudio.com/blog/claim-drift` |
| `https://docs.revealui.com/blog/13-zero-regex` | `https://revealuistudio.com/blog/zero-regex` |
| `https://docs.revealui.com/blog/12-own-your-secrets` | `https://revealuistudio.com/blog` |
| `https://docs.revealui.com/blog/11-revealfleet-product-family` | `https://revealuistudio.com/blog` |
| `https://docs.revealui.com/blog/10-own-your-data` | `https://revealuistudio.com/blog` |
| `https://docs.revealui.com/blog/09-component-library` | `https://revealuistudio.com/blog` |
| `https://docs.revealui.com/blog/08-getting-started` | `https://revealuistudio.com/blog` |
| `https://docs.revealui.com/blog/07-agent-first-future` | `https://revealuistudio.com/blog` |
| `https://docs.revealui.com/blog/06-open-source-and-pro` | `https://revealuistudio.com/blog` |
| `https://docs.revealui.com/blog/05-five-primitives` | `https://revealuistudio.com/blog` |
| `https://docs.revealui.com/blog/04-local-first-ai-stack` | `https://revealuistudio.com/blog` |
| `https://docs.revealui.com/blog/03-multi-agent-coordination` | `https://revealuistudio.com/blog` |
| `https://docs.revealui.com/blog/02-http-402-payments` | `https://revealuistudio.com/blog` |
| `https://docs.revealui.com/blog/01-why-we-built-revealui` | `https://revealuistudio.com/blog` |

If `https://docs.revealui.com/blog` itself resolves, send it to `https://revealuistudio.com/blog` as well.

Held rows point at the Studio index on purpose. Their reserved slugs (flip the destination after the brand pass publishes the essay):

| Reserved Studio URL | File still held |
|---|---|
| `https://revealuistudio.com/blog/own-your-secrets` | `12-own-your-secrets.md` |
| `https://revealuistudio.com/blog/revealfleet-product-family` | `11-revealfleet-product-family.md` |
| `https://revealuistudio.com/blog/own-your-data` | `10-own-your-data.md` |
| `https://revealuistudio.com/blog/component-library` | `09-component-library.md` |
| `https://revealuistudio.com/blog/getting-started` | `08-getting-started.md` |
| `https://revealuistudio.com/blog/agent-first-future` | `07-agent-first-future.md` |
| `https://revealuistudio.com/blog/open-source-and-pro` | `06-open-source-and-pro.md` |
| `https://revealuistudio.com/blog/five-primitives` | `05-five-primitives.md` |
| `https://revealuistudio.com/blog/local-first-ai-stack` | `04-local-first-ai-stack.md` |
| `https://revealuistudio.com/blog/multi-agent-coordination` | `03-multi-agent-coordination.md` |
| `https://revealuistudio.com/blog/http-402-payments` | `02-http-402-payments.md` |
| `https://revealuistudio.com/blog/why-we-built-revealui` | `01-why-we-built-revealui.md` |

## Admitted copy (2026-09-26)

Studio chrome uses these strings only:

- `studio-blog-home-h1-2026-09-26`: Own the stack. Keep the receipts.
- `studio-blog-home-sub-2026-09-26`: Studio writes for technical founders and small agencies who already run agents. Existing tools report in. You keep the stack. When you need the how-to, Docs has the product reference.
- `nav-blog-studio-2026-09-26`: label Blog, href `/blog` on this site.
- `nav-docs-product-2026-09-26`: label Docs, href `https://docs.revealui.com`.
- `boundary-blog-studio-docs-ref-2026-09-26`: Blog is on Studio. Docs are product reference.
- `nav-product-blog-points-studio-2026-09-26`: a Blog item on the product stays a link to `https://revealuistudio.com/blog`.

This PR does not add blog routes, essays, or a Blog section inside product docs. Social RSS stays held. Production publish stays held. Base branch is `test`.

## Docs nav

Remove the sidebar section titled Blog in `apps/docs/app/lib/nav.ts` (`buildDocNavSections`). If a Blog label remains on the product, it points at `https://revealuistudio.com/blog`. Product reference sections stay.

## Same-host safety net (this repo)

`vercel.json` redirects the numbered filename stems on `revealuistudio.com` to the Studio slug (published) or to `/blog` (held). That only helps if a numbered path is requested on the Studio host. It does not redirect `docs.revealui.com`.

## Related, not docs

Marketing still serves the essays:

| Old marketing URL | Studio URL |
|---|---|
| `https://revealui.com/blog` | `https://revealuistudio.com/blog` |
| `https://revealui.com/blog/<slug>` | `https://revealuistudio.com/blog/<slug>` for published slugs, else `https://revealuistudio.com/blog` |

Retire that home in `RevealUIStudio/revealui` `apps/marketing` when the docs redirects land, so Studio is the only blog.
