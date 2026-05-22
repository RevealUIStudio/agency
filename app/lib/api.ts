/**
 * Thin client for the RevealUI Studio agency-site API surface.
 *
 * Currently a single function — `submitContact` — pointing at the public
 * `POST /api/contact` endpoint hosted at api.revealui.com. The endpoint
 * is shared with the marketing site; we tag our submissions with
 * `source: 'agency'` so the email subject line distinguishes them.
 *
 * Build-time env override: set `VITE_API_URL` to redirect to a local
 * Hono server (e.g. http://localhost:3004) during dev.
 */

import { CONTACT_EMAIL } from './site';

const API_URL = import.meta.env.VITE_API_URL ?? 'https://api.revealui.com';

export interface ContactFormData {
  topic: string;
  name: string;
  email: string;
  /** Optional company name. */
  company?: string;
  message: string;
  /** Honeypot field — always empty for real users. */
  website?: string;
}

interface ContactResponseError {
  success?: false;
  error?: string;
}

/**
 * Submits a contact-form inquiry to the public API.
 *
 * @returns `null` on success; a user-displayable error message on failure.
 */
export async function submitContact(data: ContactFormData): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, source: 'agency' }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ContactResponseError;
      return (
        body.error ??
        `We couldn't deliver your message right now (status ${res.status}). Email ${CONTACT_EMAIL} directly and we'll respond within one business day.`
      );
    }

    return null;
  } catch (err) {
    return err instanceof Error
      ? `Network error: ${err.message}. Email ${CONTACT_EMAIL} directly.`
      : `Network error — please try again, or email ${CONTACT_EMAIL} directly.`;
  }
}
