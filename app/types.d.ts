/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_UMAMI_URL?: string;
  readonly VITE_UMAMI_WEBSITE_ID?: string;
}

// Side-effect font imports have no runtime API; declare them so TS doesn't
// complain about missing type declarations.
declare module '@fontsource-variable/geist';
declare module '@fontsource-variable/geist-mono';
