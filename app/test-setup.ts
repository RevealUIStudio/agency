import { vi } from 'vitest';

// jsdom does not implement window.scrollTo; RootLayout calls it on every
// client-side navigation. Stub it so tests exercising navigation don't log
// "Not implemented: Window's scrollTo() method".
vi.stubGlobal('scrollTo', vi.fn());
