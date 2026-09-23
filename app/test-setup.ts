import { vi } from 'vitest';

// jsdom does not implement window.scrollTo; RootLayout calls it on every
// client-side navigation. Stub it so tests exercising navigation don't log
// "Not implemented: Window's scrollTo() method".
vi.stubGlobal('scrollTo', vi.fn());

// The quote calculator asks the server who is viewing. Tests stay guests
// unless a case passes viewerRole="owner". A live fetch would wait on localhost.
const nativeFetch = globalThis.fetch.bind(globalThis);
vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.includes('/api/session')) {
    return Promise.resolve(
      new Response(JSON.stringify({ role: 'guest' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  }
  return nativeFetch(input, init);
});
