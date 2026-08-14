import { SpeedInsights } from '@vercel/speed-insights/react';
import { useState } from 'react';
import { type AgencyConsent, DENIED, readConsent, writeConsent } from '@/lib/cookie-consent';

export function CookieConsent() {
  const initial = readConsent();
  const [decided, setDecided] = useState(initial.decided);
  const [consent, setConsent] = useState<AgencyConsent>(initial.consent);

  function choose(next: AgencyConsent): void {
    writeConsent(next);
    setConsent(next);
    setDecided(true);
  }

  return (
    <>
      {decided && consent.analytics ? <SpeedInsights /> : null}
      {decided ? null : (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-consent-title"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-4 shadow-lg sm:p-6"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <h2 id="cookie-consent-title" className="text-base font-semibold text-foreground">
                Cookies
              </h2>
              <p className="text-sm text-muted-foreground">
                Necessary cookies are not used on this site (there is no login). Speed Insights, a
                first-party performance tool, stays off until you accept.{' '}
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
