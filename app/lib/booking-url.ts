/** Keep signed network links out of pageview and error telemetry URLs. */
const NETWORK_TOKEN_STATE_KEY = 'consultationNetworkToken';

/** Preserve campaign parameters while removing the signed booking capability. */
export function stripNetworkTokenFromUrl(raw: string): string {
  try {
    const url = new URL(
      raw,
      typeof window === 'undefined' ? 'https://revealuistudio.com' : window.location.origin,
    );
    if (!url.searchParams.has('nw') && !url.searchParams.has('session_id')) return raw;
    url.searchParams.delete('nw');
    url.searchParams.delete('session_id');
    return /^[a-z][a-z\d+.-]*:/iu.test(raw) ? url.href : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return raw.split('?', 1)[0] ?? '';
  }
}

export function networkTokenFromLocation(): string {
  if (typeof window === 'undefined') return '';
  const queryToken = new URLSearchParams(window.location.search).get('nw')?.trim();
  if (queryToken) return queryToken;
  const state: unknown = window.history.state;
  if (!state || typeof state !== 'object' || !(NETWORK_TOKEN_STATE_KEY in state)) return '';
  const token = state[NETWORK_TOKEN_STATE_KEY];
  return typeof token === 'string' ? token : '';
}

export function scrubNetworkTokenFromUrl(): void {
  if (typeof window === 'undefined' || window.location.pathname !== '/consultation/book') return;
  const url = new URL(window.location.href);
  const token = url.searchParams.get('nw')?.trim();
  if (!token) return;
  url.searchParams.delete('nw');
  const state: unknown = window.history.state;
  const prior = state && typeof state === 'object' ? state : {};
  window.history.replaceState(
    { ...prior, [NETWORK_TOKEN_STATE_KEY]: token },
    '',
    `${url.pathname}${url.search}${url.hash}`,
  );
}

/** Keep the Checkout bearer reference out of telemetry and outbound referrers. */
export function scrubCheckoutReferenceFromUrl(): void {
  if (typeof window === 'undefined' || window.location.pathname !== '/consultation/book/success')
    return;
  const url = new URL(window.location.href);
  const session = url.searchParams.get('session_id');
  if (!session) return;
  url.searchParams.delete('session_id');
  const prior: unknown = window.history.state;
  window.history.replaceState(
    { ...(prior && typeof prior === 'object' ? prior : {}), consultationCheckoutSession: session },
    '',
    `${url.pathname}${url.search}${url.hash}`,
  );
}

export function checkoutReferenceFromLocation(): string {
  if (typeof window === 'undefined') return '';
  const query = new URLSearchParams(window.location.search).get('session_id');
  if (query) return query;
  const state: unknown = window.history.state;
  return state &&
    typeof state === 'object' &&
    'consultationCheckoutSession' in state &&
    typeof state.consultationCheckoutSession === 'string'
    ? state.consultationCheckoutSession
    : '';
}
