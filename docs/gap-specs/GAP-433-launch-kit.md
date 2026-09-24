# Launch pulse kit — r/selfhosted and Show HN

Owner paste only. Joshua posts both threads under his own name and stays for comments.

Do not post this from a bot, a script, CI, or an agent. Do not merge a promotion off the back of this file.

This kit is the product self-host pulse. It is not a RevealUI Studio services pitch. Paste only the blocks marked **PASTE**. Everything under **INTERNAL** stays off Reddit and Hacker News.

Re-read the source docs on the day you post. If a number there moved, the source wins.

## What changed on the homepage

Nothing in this change. On `test` after the 2026-09-22 offer lock, `PUBLIC_OFFERS` in `app/lib/engagements.ts` is Consultation, Proof Sprint, and Launch. Care is an optional export and is not in that trio. Leave it that way.

## Sources (read these, do not invent past them)

Checked 2026-09-23 against public RevealUI `test`:

- `docs/WHAT_IS.md` (last updated 2026-09-16) — definition, tier names, prices, “no paying external customers yet,” self-host.
- `docs/QUICK_START.md` — `npx create-revealui@latest`, Node.js 24+, pnpm 10+, Neon example for `POSTGRES_URL`, Stripe and R2 marked optional for local dev.
- `docs/LOCAL_FIRST.md` — local inference is an optional path. The default documented deploy still uses cloud services (Neon Postgres, Stripe, Cloudflare R2).
- `docs/MARKETING_METRICS.md` §2 Track A and Track C (last-verified 2026-09-17) — Free / Pro / Max / perpetual prices. §1 names the five FSL packages.
- Repo-root `docker-compose.yml` header — local Postgres (`pgvector/pgvector:pg16`) as the alternative to Neon; API and admin in the compose; marketing site omitted.
- Studio offer lock 2026-09-22 — Consultation, Proof Sprint, Launch. Used only in the “if they ask to hire Studio” stub.

The coordination-repo copy of this kit was not reachable from this checkout. This file was written from the sources above. It does not carry forward an older price.

---

## INTERNAL — price lock (do not paste this table)

### Product licenses (revealui.com)

| Tier | List price | Say it when |
|---|---|---|
| Free | $0 | Always fine. 1 site, 3 users, local AI, 200 API req/min. |
| Pro | $49/mo | Always fine. 5 sites, 25 users, 10,000 agent tasks/mo, 300 req/min. |
| Max | **$99/mo** ($799/yr) | Always fine. 15 sites, 100 users, 50,000 agent tasks/mo, 600 req/min. |
| Enterprise | Inquire / contact sales | Unlimited sites, users, and agent tasks on the published table. Customer still self-hosts. |
| Pro Perpetual | $1,499 one-time, $149/yr support renewal | Only if someone asks about a perpetual license. |

Max is **$99/mo**. Do not write **$299**.

Open-source packages are MIT. Pro packages are Fair Source (FSL-1.1-MIT) and convert to MIT two years after each release. The five FSL packages named in Marketing Metrics §1 (last-verified 2026-09-17) are `@revealui/ai`, `@revealui/engines`, `@revealui/harnesses`, `@revealui/mcp`, and `@revealui/services`. Re-check that list before you name them in a comment.

### Studio services — only if a stranger asks to hire RevealUI Studio

| Offer | List price |
|---|---|
| Consultation | **$300** (tax $0). Default 1 hour. Multi-hour is $300 × hours. |
| Proof Sprint | **$3,997**. One site, one receipted action they operate. 100% credits to Launch if Launch starts within 45 days of Proof start. |
| Launch | **$14,500**. Architecture stays inside this offer. Runbook. 30-day async stabilization. |

Do not put these prices in the opening post. The opening post stays on the product.

### Stranger-sell refuse (these posts)

- **Care is $1,997/mo, optional, and off the stranger homepage.** Do not name Care. Do not quote $1,997. Do not link a Care checkout. Do not offer it as a follow-on in the thread.
- Do not mention the domain pack, Stage B, a $297 custom-domain add-on, or any fee waiver.
- Do not write Pilot, $1,500, or $7,500.
- Do not mention CapCut or Cal.com. Studio intro booking, if you must point at it, is the Google Calendar intro already on revealuistudio.com.
- Do not claim SOC 2 certified, SOC 2 ready, SOC 2 compliant, SOC 2 audited, or ISO 27001 certified. Honest line if asked: not certified. A vendor’s report covers the vendor, not RevealUI and not RevealUI Studio.
- Do not invent customers, logos, revenue, uptime, star counts, download counts, or user counts. There are no paying external customers yet (`docs/WHAT_IS.md`). Say that if someone asks about traction. Do not imply a customer base.
- Do not claim a phone-home or telemetry number you have not just verified in the tree.
- SSO is an operator preview, not a customer-walked feature. White-label branding is planned. Do not sell either as shipped.
- Knowledge Graph is part of the runtime. It is not a fourth Studio offer.

---

## PASTE — r/selfhosted

**Title**

```
RevealUI — self-hosted runtime for people, offers, payments, and agents
```

**Body**

```
I am the author.

RevealUI is an agentic business runtime you run on your own domain. People, content, offers, payments, and agents share one permission model and one API. "Content" here means offers and pages you already ship, not a video CMS. It is not a hosted black box. The project does not operate a dedicated customer VM for you.

Two ways in:

- New app: `npx create-revealui@latest` (Node.js 24+, pnpm 10+). Steps are in docs/QUICK_START.md.
- Self-host compose: repo-root docker-compose.yml. It includes local Postgres (pgvector/pgvector:pg16) as the alternative to Neon, the Hono API on port 3004, and the Next.js admin on port 4000. Copy .env.production.example to .env and read the file before you start it. The marketing site is not in that compose.

Honest limits. The published quick start uses a Neon Postgres URL, and it marks Stripe and object storage optional for local dev. The default documented deploy still uses those cloud pieces. Local inference (Ollama or Ubuntu Inference Snaps) is an optional path, not the default. I am not describing a zero-account offline appliance.

License. Open-source packages are MIT. Pro packages are Fair Source (FSL-1.1-MIT) and convert to MIT two years after each release.

Licenses, if you want one. Free is $0 (1 site, 3 users, local AI). Pro is $49/mo. Max is $99/mo ($799/yr). Enterprise is inquire, and you still self-host. You can clone the repo without buying a license.

Where it actually is. The runtime is shipped and the product docs mark it Beta. Stripe live mode is on. That is a billing-rail fact, not a customer claim. There are no paying external customers yet. RevealUI is not SOC 2 certified.

Repo: https://github.com/RevealUIStudio/revealui
Site: https://revealui.com
Docs: https://docs.revealui.com

I will stay in the comments.
```

## PASTE — Show HN

**Title** (keep the Show HN prefix)

```
Show HN: RevealUI – self-hosted runtime for people, offers, payments, and agents
```

**URL**

```
https://github.com/RevealUIStudio/revealui
```

**First comment** (paste this yourself under the submission)

```
I built RevealUI. It is an agentic business runtime you run on your own domain. Humans and agents share one permission model, one API, and one data model across five primitives: people, content, offers, payments, and agents. "Content" means offers and pages you already ship, not a video CMS.

Self-host is the point of the post. `npx create-revealui@latest` is the new-project path (Node.js 24+, pnpm 10+). The repo-root docker-compose.yml runs local Postgres (pgvector/pgvector:pg16) as an alternative to Neon, plus the Hono API (port 3004) and the Next.js admin (port 4000). The marketing site is not in that compose. The quick start's database example is Neon, and Stripe and object storage are optional for local dev. Local inference via Ollama or Ubuntu Inference Snaps is optional. The default documented deploy still uses cloud Postgres, Stripe, and object storage. This is not a single-binary homelab app with no accounts.

Open-source packages are MIT. Pro packages are FSL-1.1-MIT and convert to MIT two years after each release.

Free is $0. Pro is $49/mo. Max is $99/mo ($799/yr). Enterprise is inquire. You still self-host. I am not posting this to sell a hosted seat.

The runtime is shipped and marked Beta in the product docs. There are no paying external customers yet. Stripe live mode is on; that only means the billing rail exists. RevealUI is not SOC 2 certified.

Docs: https://docs.revealui.com
What it is, in the repo's own words: docs/WHAT_IS.md

I will stay for comments. Corrections to the install path are welcome — the compose file and docs/QUICK_START.md are the source, not this comment, if they disagree.
```

---

## INTERNAL — comment stubs

Type these yourself if the question shows up. Do not pre-schedule them. Do not mention Care.

**“Is this really self-hosted?”**

```
The compose file ships a local Postgres container (pgvector/pgvector:pg16) because migrations create the vector extension. That is the documented alternative to Neon. The API and admin are in the same compose. You still bring secrets, and billing needs Stripe keys before checkout works. The quick start marks Stripe and R2 optional for local dev. I do not claim it boots with an empty .env.
```

**“What’s the license / what’s not MIT?”**

```
Open-source packages are MIT. Pro packages are FSL-1.1-MIT and convert to MIT two years after each release. Before I name the FSL package list I will re-read docs/MARKETING_METRICS.md section 1, because that list is the source.
```

**“How much is Max?”**

```
Max is $99/mo, or $799/yr. Pro is $49/mo. Free is $0. Enterprise is inquire.
```

**“Do you have users / customers / revenue?”**

```
No paying external customers yet. I am not going to quote a star count, a download count, or a user count in this thread.
```

**“Are you SOC 2 certified?”**

```
No. RevealUI is not SOC 2 certified, and RevealUI Studio is not SOC 2 or ISO 27001 certified. A vendor attestation covers that vendor, not us.
```

**“Can you just host it / build it for me?”**

```
This thread is the self-host product. If you want RevealUI Studio to implement it: Consultation is $300 (tax $0, default one hour), Proof Sprint is $3,997, Launch is $14,500. A 30-minute intro is on https://revealuistudio.com. Product licenses stay on https://revealui.com.
```

That stub is the only Studio price block. It has no Care line. It has no waiver line. It has no Pilot line.

**“Does it phone home?”**

```
I am not going to claim a telemetry number from memory. I will answer from the current tree, or I will say I have not checked that path yet.
```

**“Is SSO / white-label included?”**

```
SSO is an operator preview, not a feature I have walked a customer through. White-label branding is planned, not shipped. Enterprise is still self-host.
```

## Pre-post check

- [ ] Both pastes still say Max **$99**, not $299.
- [ ] Neither paste names Care, Pilot, $1,500, $7,500, the domain pack, Stage B, or a waiver.
- [ ] Neither paste says SOC 2 certified, ready, compliant, or audited.
- [ ] Neither paste names a customer, a logo, or a traction number.
- [ ] Neither paste mentions CapCut or Cal.com.
- [ ] `PUBLIC_OFFERS` is still Consultation, Proof Sprint, Launch.
- [ ] You are posting from your own Reddit and HN accounts, and you can stay for comments.
