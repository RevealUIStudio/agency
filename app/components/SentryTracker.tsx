import { useEffect } from 'react';
import { initSentry } from '@/lib/sentry';

/**
 * Initialises the Sentry browser SDK once. Parent must only mount this
 * after analytics consent is true (same gate as Speed Insights / Umami).
 * Still a no-op when `VITE_SENTRY_DSN` is absent.
 */
export function SentryTracker() {
  useEffect(() => {
    initSentry();
  }, []);

  return null;
}
