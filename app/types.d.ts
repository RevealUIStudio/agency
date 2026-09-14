/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_UMAMI_URL?: string;
  readonly VITE_UMAMI_WEBSITE_ID?: string;
  /**
   * Sentry DSN for the agency client. Absent in dev (and in prod before the
   * owner pastes a real DSN into Vercel env); the SDK init is a no-op when
   * missing so the build stays clean.
   */
  readonly VITE_SENTRY_DSN?: string;
}

// Side-effect font imports have no runtime API; declare them so TS doesn't
// complain about missing type declarations.
declare module '@fontsource-variable/geist';
declare module '@fontsource-variable/geist-mono';
