import { SpeedInsights } from '@vercel/speed-insights/react';
import { useLayoutEffect, useRef, useState } from 'react';
import { SentryTracker } from '@/components/SentryTracker';
import { UmamiTracker } from '@/components/UmamiTracker';
import { type AgencyConsent, DENIED, readConsent, writeConsent } from '@/lib/cookie-consent';

/** Bottom offset for other fixed bars, such as the Consultation pay dock. */
export const COOKIE_BANNER_HEIGHT_VAR = '--cookie-banner-height';

export function CookieConsent() {
  const initial = readConsent();
  const [decided, setDecided] = useState(initial.decided);
  const [consent, setConsent] = useState<AgencyConsent>(initial.consent);
  const bannerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (decided) {
      document.documentElement.style.removeProperty(COOKIE_BANNER_HEIGHT_VAR);
      return;
    }
    const node = bannerRef.current;
    if (!node) {
      document.documentElement.style.removeProperty(COOKIE_BANNER_HEIGHT_VAR);
      return;
    }
    const write = () => {
      document.documentElement.style.setProperty(
        COOKIE_BANNER_HEIGHT_VAR,
        `${node.offsetHeight}px`,
      );
    };
    write();
    if (typeof ResizeObserver === 'undefined') {
      return () => {
        document.documentElement.style.removeProperty(COOKIE_BANNER_HEIGHT_VAR);
      };
    }
    const observer = new ResizeObserver(write);
    observer.observe(node);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty(COOKIE_BANNER_HEIGHT_VAR);
    };
  }, [decided]);

  function choose(next: AgencyConsent): void {
    writeConsent(next);
    setConsent(next);
    setDecided(true);
  }

  return (
    <>
      {decided && consent.analytics ? (
        <>
          <SpeedInsights />
          <UmamiTracker />
          <SentryTracker />
        </>
      ) : null}
      {decided ? null : (
        <div
          ref={bannerRef}
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-consent-title"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background p-4 shadow-lg sm:p-6"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <h2 id="cookie-consent-title" className="text-base font-semibold text-foreground">
                Cookies
              </h2>
              <p className="text-sm text-muted-foreground">
                Necessary cookies are not used on this site (there is no login). Speed Insights,
                Umami pageview analytics, and Sentry crash tracing stay off until you accept.{' '}
                <a href="/cookies" className="font-medium text-foreground underline">
                  Cookie policy
                </a>
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                onClick={() => choose({ ...DENIED, analytics: true })}
              >
                Accept all
              </button>
              <button
                type="button"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground"
                onClick={() => choose(DENIED)}
              >
                Reject all
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
