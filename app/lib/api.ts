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

import { type ContactInquiry, ContactInquirySchema } from '@revealui/contracts/public-inquiry';
import { CONTACT_EMAIL } from './site';

const API_URL = import.meta.env.VITE_API_URL ?? 'https://api.revealui.com';

export type ContactFormData = Omit<ContactInquiry, 'source'>;

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
  const parsed = ContactInquirySchema.safeParse({ ...data, source: 'agency' });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? 'Please check the inquiry fields.';
  try {
    const res = await fetch(`${API_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ContactResponseError;
      return (
        (typeof body.error === 'string' ? body.error : undefined) ??
        `We couldn't deliver your message right now (status ${res.status}). Email ${CONTACT_EMAIL} directly and we aim to respond within 1–2 business days.`
      );
    }

    const body: unknown = await res.json();
    if (body && typeof body === 'object' && 'success' in body && body.success === true) return null;
    return `We could not confirm that your message was accepted. Email ${CONTACT_EMAIL} directly.`;
  } catch {
    return `We could not confirm that your message was accepted. Please try again or email ${CONTACT_EMAIL} directly.`;
  }
}
