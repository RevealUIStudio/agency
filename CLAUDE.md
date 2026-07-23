# RevealUI Studio Agency Site

Public-facing agency site at https://revealuistudio.com.

## Stack

- Vite + React 19
- @revealui/{router, presentation, contracts} (consumed via npm; contracts for Track D prices)
- Vercel-deployed; auto-deploy on `main` push

## Brand naming

- `@revealui/router` (not "React Router")
- "RevealUI Studio" = the company; "RevealUI" = the open-source product

## Dependencies

- The former `pnpm.overrides.hono` floor (`>=4.12.21`, the patched line) was
  dropped 2026-07-17: `@revealui/router` 0.3.11 pins hono `4.12.27`, above the
  floor, so the router's own range now guarantees it. hono is a transitive via
  `@hono/node-server`, server-side only, not shipped in the SPA bundle.

## Git identity

RevealUI Studio <43050008+joshua-v-dev@users.noreply.github.com>

> Amended 2026-07-10. The prior founder@revealui.com address is retired: commits carrying it render Unverified under required signatures. Do not restore it.

## License

UNLICENSED (private). Site copy is RevealUI Studio property. The
underlying `@revealui/*` packages it consumes are MIT / FSL-1.1-MIT.
