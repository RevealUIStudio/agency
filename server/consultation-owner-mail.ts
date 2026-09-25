/**
 * Deliver the paid Consultation notice to founder@revealui.com.
 *
 * Prefer Gmail send. If send is denied, store a durable Gmail draft.
 * The buyer is never the recipient. No second mail provider.
 */

import { OWNER_NOTIFY_EMAIL, type OwnerPaidNotice } from '../app/lib/consultation-owner';
import { type ConsultationEnv, googleAccessToken } from './consultation-calendar';

const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const GMAIL_COMPOSE_SCOPE = 'https://www.googleapis.com/auth/gmail.compose';
const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const DRAFT_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/drafts';

export type OwnerMailDelivery = 'sent' | 'draft' | 'unconfigured' | 'failed';

export function ownerMailConfigured(env: ConsultationEnv): boolean {
  const refresh = Boolean(env.oauthClientId && env.oauthClientSecret && env.oauthRefreshToken);
  const service = Boolean(env.googleClientEmail && env.googleCredential);
  return refresh || service;
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

/** RFC 5322 message. Headers address the founder only. */
export function ownerPaidRfc822(notice: OwnerPaidNotice): string {
  const lines = [
    `From: "RevealUI Studio" <${OWNER_NOTIFY_EMAIL}>`,
    `To: ${OWNER_NOTIFY_EMAIL}`,
    `Subject: ${notice.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    notice.text,
  ];
  return lines.join('\r\n');
}

function encodeRaw(message: string): string {
  return base64Url(new TextEncoder().encode(message));
}

type PostResult = 'ok' | 'denied' | 'failed';

async function postJson(
  url: string,
  token: string,
  body: unknown,
  fetchImpl: typeof fetch,
): Promise<PostResult> {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (response.ok) return 'ok';
  if (response.status === 401 || response.status === 403) return 'denied';
  return 'failed';
}

export async function deliverOwnerPaidNotice(
  env: ConsultationEnv,
  notice: OwnerPaidNotice,
  fetchImpl: typeof fetch = fetch,
): Promise<OwnerMailDelivery> {
  if (notice.to !== OWNER_NOTIFY_EMAIL) return 'failed';
  if (!ownerMailConfigured(env)) return 'unconfigured';
  const raw = encodeRaw(ownerPaidRfc822(notice));
  try {
    const token = await googleAccessToken(env, fetchImpl, GMAIL_SEND_SCOPE);
    const sent = await postJson(SEND_URL, token, { raw }, fetchImpl);
    if (sent === 'ok') return 'sent';
  } catch {
    // Send auth failed. A draft may still be possible.
  }
  try {
    const token = await googleAccessToken(env, fetchImpl, GMAIL_COMPOSE_SCOPE);
    const drafted = await postJson(DRAFT_URL, token, { message: { raw } }, fetchImpl);
    if (drafted === 'ok') return 'draft';
  } catch {
    // Both paths failed. The calendar event is already written.
  }
  console.error(`owner-notify failed booking=${notice.bookingId}`);
  return 'failed';
}
