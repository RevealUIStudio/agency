/**
 * @vitest-environment node
 */
import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { Booking } from '../../app/lib/consultation-booking';
import { buildOwnerPaidNotice } from '../../app/lib/consultation-owner';
import { deliverOwnerPaidNotice, ownerPaidRfc822 } from '../consultation-owner-mail';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const DRAFT_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/drafts';

const booking: Booking = {
  booking_id: 'book_owner',
  start: '2026-01-07T14:00:00.000Z',
  end: '2026-01-07T15:00:00.000Z',
  hours: 1,
  name: 'Ada Buyer',
  email: 'ada@example.com',
  company: null,
  stage_b: true,
  stage_b_fee: 'paid_addon',
  network_jti: null,
  status: 'paid_scheduled',
  expires_at: '2026-01-07T14:00:00.000Z',
  event_id: 'evt_owner',
  meet_link: 'https://meet.google.com/lookup/book_owner',
  stripe_session_id: 'cs_owner',
};

function decodeRaw(body: string): string {
  const payload = JSON.parse(body) as { raw?: string; message?: { raw?: string } };
  const raw = payload.raw ?? payload.message?.raw ?? '';
  const padded = raw.replaceAll('-', '+').replaceAll('_', '/');
  return Buffer.from(padded, 'base64').toString('utf8');
}

describe('owner paid mail', () => {
  it('addresses the founder and keeps Google Meet in the plain-text body', () => {
    const notice = buildOwnerPaidNotice(booking, 59_700);
    const message = ownerPaidRfc822(notice);
    expect(message.startsWith('From: "RevealUI Studio" <founder@revealui.com>\r\n')).toBe(true);
    expect(message).toContain('\r\nTo: founder@revealui.com\r\n');
    expect(message).not.toContain('To: ada@example.com');
    expect(message).toContain('Subject: RevealUI Studio Consultation paid');
    expect(message).toContain('Amount: $597');
    expect(message).toContain('Google Meet: https://meet.google.com/lookup/book_owner');
    expect(message).toContain('Stage B: yes');
    expect(message).toContain('Network: no');
    expect(message).not.toContain('RevealUIWordmark');
    expect(message).not.toContain('\u2014');
    expect(notice.text.replaceAll('Google Meet', '')).not.toMatch(/Meet/);
  });

  it('stores a Gmail draft when send is denied', async () => {
    const notice = buildOwnerPaidNotice(booking, 59_700);
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push(url);
      if (url === TOKEN_URL) {
        return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), {
          status: 200,
        });
      }
      if (url === SEND_URL) return new Response('denied', { status: 403 });
      if (url === DRAFT_URL) {
        const message = decodeRaw(String(init?.body ?? ''));
        expect(message).toContain('To: founder@revealui.com');
        expect(message).toContain('Booking: book_owner');
        expect(message).not.toContain('To: ada@example.com');
        return new Response(JSON.stringify({ id: 'draft_1' }), { status: 200 });
      }
      return new Response('no', { status: 404 });
    };
    const delivery = await deliverOwnerPaidNotice(
      {
        oauthClientId: 'owner-oauth',
        oauthClientSecret: 'owner-secret',
        oauthRefreshToken: 'owner-refresh',
      },
      notice,
      fetchImpl,
    );
    expect(delivery).toBe('draft');
    expect(calls).toContain(SEND_URL);
    expect(calls).toContain(DRAFT_URL);
  });

  it('requests gmail.send on the service-account assertion', async () => {
    const credential = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    }).privateKey;
    let assertion = '';
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url === TOKEN_URL) {
        const params = new URLSearchParams(String(init?.body ?? ''));
        assertion = params.get('assertion') ?? '';
        return new Response(JSON.stringify({ access_token: 'tok-sa', expires_in: 3600 }), {
          status: 200,
        });
      }
      if (url === SEND_URL) return new Response(JSON.stringify({ id: 'msg_sa' }), { status: 200 });
      return new Response('no', { status: 404 });
    };
    const delivery = await deliverOwnerPaidNotice(
      {
        googleClientEmail: 'sa@example.com',
        googleCredential: credential,
        googleImpersonateSubject: 'founder@revealui.com',
      },
      buildOwnerPaidNotice(booking, 30_000),
      fetchImpl,
    );
    expect(delivery).toBe('sent');
    const part = assertion.split('.')[1] ?? '';
    const padded = part.replaceAll('-', '+').replaceAll('_', '/');
    const claims = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as {
      scope?: string;
      sub?: string;
    };
    expect(claims.scope).toBe('https://www.googleapis.com/auth/gmail.send');
    expect(claims.sub).toBe('founder@revealui.com');
  });
});
