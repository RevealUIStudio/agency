/**
 * Sentry client init for the agency site (Vite + React).
 *
 * Mirrors the marketing-site pattern (`@sentry/react` + `VITE_SENTRY_DSN`)
 * and the agency Umami gate: the SDK stays dormant without a DSN, and
 * tracing / on-error replay stay at 0 until analytics consent is true
 * *and* the build is production. `replaysSessionSampleRate` stays 0 —
 * no proactive session recording.
 *
 * Build-time env (set on the Vercel project for `test` and production):
 *   VITE_SENTRY_DSN=<dsn from the agency Sentry project>
 *
 * Do not commit a real DSN. The init is a no-op when the variable is
 * absent so local and CI builds stay clean. Org/project live in Vercel.
 */

import * as Sentry from '@sentry/react';
import { readConsent } from '@/lib/cookie-consent';

export interface SentryInitEnv {
  readonly VITE_SENTRY_DSN?: string;
  readonly MODE?: string;
  readonly PROD?: boolean;
}

const IGNORE_ERRORS: Array<string | RegExp> = [
  // String substring matches — Sentry treats strings as substring includes.
  'Non-Error promise rejection captured',
  'NetworkError',
  'Failed to fetch',
  // REGEX-CONFIG-BOUNDARY: third-party-API regex string passed to Sentry SDK config.
  // Filters out errors thrown from browser extensions, which we cannot fix.
  /extensions\//i,
];

export function readSentryDsn(
  env: Pick<SentryInitEnv, 'VITE_SENTRY_DSN'> = import.meta.env,
): string | null {
  const raw = typeof env.VITE_SENTRY_DSN === 'string' ? env.VITE_SENTRY_DSN.trim() : '';
  return raw || null;
}

export function hasAnalyticsConsent(): boolean {
  return readConsent().consent.analytics === true;
}

export function sentrySampleRates(
  consent: boolean,
  prod: boolean,
): {
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
} {
  const consentedProd = consent && prod;
  return {
    tracesSampleRate: consentedProd ? 0.1 : 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: consentedProd ? 1.0 : 0,
  };
}

function redactEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  const request = event.request;
  if (request) {
    if (request.cookies) {
      request.cookies = undefined;
    }
    if (request.headers) {
      const redacted: Record<string, string> = {};
      for (const [key, value] of Object.entries(request.headers)) {
        if (key.toLowerCase() === 'authorization') {
          redacted[key] = '[REDACTED]';
        } else {
          redacted[key] = value as string;
        }
      }
      request.headers = redacted;
    }
  }
  return event;
}

/**
 * Initialise the browser SDK. No-op without a DSN. No-op without analytics
 * consent (same gate as Umami / Speed Insights). Returns whether `Sentry.init`
 * ran on this call.
 */
export function initSentry(env: SentryInitEnv = import.meta.env): boolean {
  const dsn = readSentryDsn(env);
  if (!dsn) {
    return false;
  }
  const consent = hasAnalyticsConsent();
  if (!consent) {
    return false;
  }
  if (Sentry.getClient()) {
    return false;
  }

  const prod = env.PROD === true;
  const rates = sentrySampleRates(consent, prod);
  const integrations =
    prod && typeof Sentry.browserTracingIntegration === 'function'
      ? [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ]
      : [];

  Sentry.init({
    dsn,
    environment: env.MODE ?? 'development',
    ...rates,
    integrations,
    ignoreErrors: IGNORE_ERRORS,
    beforeSend(event) {
      if (!prod) {
        return null;
      }
      return redactEvent(event);
    },
  });
  return true;
}

/**
 * Reports a render error to Sentry if the SDK was initialised. No-op otherwise.
 */
export function captureRenderError(error: Error, info: { componentStack?: string | null }): void {
  if (!readSentryDsn() || !Sentry.getClient()) {
    return;
  }
  Sentry.withScope((scope) => {
    if (info.componentStack) {
      scope.setExtra('componentStack', info.componentStack);
    }
    Sentry.captureException(error);
  });
}
