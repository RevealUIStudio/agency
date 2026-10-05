/** Shared bounded transport for credentialed provider/content requests. */
export function providerFetch(input: string, init: RequestInit, fetchImpl: typeof fetch = fetch) {
  const deadline = AbortSignal.timeout(15000);
  return fetchImpl(input, {
    ...init,
    redirect: 'error',
    signal: init.signal ? AbortSignal.any([init.signal, deadline]) : deadline,
  });
}
