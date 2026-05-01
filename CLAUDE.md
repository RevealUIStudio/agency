# RevealUI Studio Agency Site

Public-facing agency site at https://revealuistudio.com.

## Stack

- Vite + React 19
- @revealui/{router, presentation, core, contracts} (consumed via npm)
- Vercel-deployed; auto-deploy on `main` push

## Coordination

- Shared workboard at `~/suite/.jv/.claude/workboard.md` — read on session start
- Master plan at `~/suite/.jv/docs/MASTER_PLAN.md` (§5.21 Agency site)
- Multi-agent coordination plan: `~/suite/.jv/docs/multi-agent-coordination-plan.md`
- Predecessor handoffs in `~/suite/.jv/docs/HANDOFF-*.md` (most recent: 2026-05-01 comprehensive EOD)

## Brand naming

See `~/suite/.jv/docs/brand-naming.md` for the canonical convention.

- Always say `@revealui/router` (not "React Router") per memory `feedback_revealui_router_naming`
- "RevealUI Studio" = company; "RevealUI" = product brand

## Git identity

RevealUI Studio <founder@revealui.com> (per `~/suite/.jv/.claude/rules/git.md`)

## License

MIT (matches the @revealui/* OSS packages it consumes)

## Phase 2 status (as of 2026-05-01)

Live with refreshed pricing, founder bio, Privacy + Terms, ContactForm wired to api.revealui.com. Phase 3 case studies gated on Allevia deal close. See MASTER_PLAN §5.21 for the full status.
