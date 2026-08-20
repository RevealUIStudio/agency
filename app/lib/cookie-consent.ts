/**
 * First-party cookie choice for the agency site.
 * Same cookie name and JSON shape as @revealui/presentation so a later
 * presentation bump can replace this file without migrating visitors.
 */

export const COOKIE_NAME = 'revealui-cookie-consent';
const MAX_AGE = 180 * 24 * 60 * 60;

export interface AgencyConsent {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export const DENIED: AgencyConsent = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

export function readConsent(): { consent: AgencyConsent; decided: boolean } {
  if (typeof document === 'undefined') {
    return { consent: DENIED, decided: false };
  }
  const prefix = `${COOKIE_NAME}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(prefix)) {
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(decodeURIComponent(trimmed.slice(prefix.length)));
      if (typeof parsed === 'object' && parsed !== null) {
        const record = parsed as Record<string, unknown>;
        return {
          decided: true,
          consent: {
            necessary: true,
            functional: record.functional === true,
            analytics: record.analytics === true,
            marketing: record.marketing === true,
          },
        };
      }
    } catch {
      return { consent: DENIED, decided: false };
    }
  }
  return { consent: DENIED, decided: false };
}

export function writeConsent(consent: AgencyConsent): void {
  const payload = {
    ...consent,
    necessary: true,
    version: 1,
    updatedAt: new Date().toISOString(),
    source: 'explicit',
  };
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  // First-party consent cookie must be JS-readable (not HttpOnly).
  // biome-ignore lint/suspicious/noDocumentCookie: this module is the consent cookie writer
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(payload))}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`;
}
