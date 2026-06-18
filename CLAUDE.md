# RevealUI Studio Agency Site

Public-facing agency site at https://revealuistudio.com.

## Stack

- Vite + React 19
- @revealui/{router, presentation} (consumed via npm)
- Vercel-deployed; auto-deploy on `main` push

## Brand naming

- `@revealui/router` (not "React Router")
- "RevealUI Studio" = the company; "RevealUI" = the open-source product

## Dependencies

- `pnpm.overrides.hono` floors hono at `>=4.12.21` (the patched line). hono is a
  transitive of `@revealui/router` via `@hono/node-server`; the override is
  forward-protective and safe to drop once the router's own range guarantees the
  floor. Server-side only, not shipped in the SPA bundle.

## Git identity

RevealUI Studio <founder@revealui.com>

## License

UNLICENSED (private). Site copy is RevealUI Studio property. The
underlying `@revealui/*` packages it consumes are MIT / FSL-1.1-MIT.
