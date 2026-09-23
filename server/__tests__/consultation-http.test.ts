import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  type CheckoutDraft,
  CONSULTATION_HOLD_TTL_MS,
  CONSULTATION_STRIPE_PRICE_ID,
  consultationCheckoutMetadata,
  STAGE_B_STRIPE_PRICE_ID,
} from '../../app/lib/consultation-book';
import { MemoryCalendar } from '../consultation-calendar';
import type { DeskConsultationUpdate } from '../consultation-desk';
import type { ConsultationConfirmEmail } from '../consultation-email';
import {
  type ConsultationDeps,
  handleAvailability,
  handleBook,
  handleStripeWebhook,
} from '../consultation-http';
import { MemoryBookingStore } from '../consultation-store';
import {
  encodeCheckoutForm,
  type StripeGateway,
  verifyStripeSignature,
} from '../consultation-stripe';

const SECRET = 'whsec_test';
const NOW = new Date('2026-09-23T12:00:00.000Z');

class RecordingStripe implements StripeGateway {
  drafts: CheckoutDraft[] = [];

  async createCheckout(input: {
    draft: CheckoutDraft;
    successUrl: string;
    cancelUrl: string;
    expiresAtSec: number;
  }) {
    this.drafts.push(input.draft);
    return { id: 'cs_test_book', url: 'https://checkout.stripe.com/c/pay/cs_test_book' };
  }
}

function harness(options?: {
  busy?: { start: string; end: string }[];
  stripe?: StripeGateway | null;
}) {
  let now = NOW;
  const calendar = new MemoryCalendar(options?.busy ?? []);
  const store = new MemoryBookingStore();
  const stripe = options?.stripe === undefined ? new RecordingStripe() : options.stripe;
  const desk: DeskConsultationUpdate[] = [];
  const emails: ConsultationConfirmEmail[] = [];
  const deps: ConsultationDeps = {
    now: () => now,
    store,
    calendar,
    stripe,
    webhookSecret: SECRET,
    desk: {
      async record(update) {
        desk.push(update);
      },
    },
    onConfirmEmail(email) {
      emails.push(email);
    },
    siteUrl: 'https://revealuistudio.com',
  };
  return {
    deps,
    calendar,
    store,
    stripe: stripe instanceof RecordingStripe ? stripe : null,
    desk,
    emails,
    setNow(next: Date) {
      now = next;
    },
  };
}

function signed(payload: string, now = NOW, secret = SECRET): Request {
  const stamp = Math.floor(now.getTime() / 1000);
  const signature = createHmac('sha256', secret).update(`${stamp}.${payload}`).digest('hex');
  return new Request('https://revealuistudio.com/api/stripe/webhook', {
    method: 'POST',
    headers: {
      'stripe-signature': `t=${stamp},v1=${signature}`,
      'content-type': 'application/json',
    },
    body: payload,
  });
}

async function book(
  deps: ConsultationDeps,
  slot: { start: string; end: string },
  extra?: { stage_b?: boolean; hours?: number; company?: string },
) {
  return handleBook(
    new Request('https://revealuistudio.com/api/consultation/book', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        start: slot.start,
        end: slot.end,
        hours: extra?.hours ?? 1,
        name: 'Ada Lovelace',
        email: 'Ada@Example.com',
        company: extra?.company ?? 'Analytical Engines',
        stage_b: extra?.stage_b ?? false,
        ...extra,
      }),
    }),
    deps,
  );
}

describe('consultation availability and hold', () => {
  it('hides busy time, holds a slot, and releases it after the TTL', async () => {
    const rig = harness({
      busy: [{ start: '2026-09-23T14:00:00.000Z', end: '2026-09-23T15:00:00.000Z' }],
    });
    const listed = await handleAvailability(
      new Request('https://revealuistudio.com/api/consultation/availability?hours=1'),
      rig.deps,
    );
    expect(listed.status).toBe(200);
    const body = (await listed.json()) as { slots: Array<{ start: string; end: string }> };
    expect(body.slots.map((slot) => slot.start)).not.toContain('2026-09-23T14:00:00.000Z');
    const slot = body.slots.find((item) => item.start === '2026-09-23T18:00:00.000Z');
    expect(slot).toBeTruthy();
    if (!slot) return;

    const saved = await book(rig.deps, slot);
    expect(saved.status).toBe(200);
    const savedBody = (await saved.json()) as { checkout_url: string; booking_id: string };
    expect(savedBody.checkout_url).toContain('checkout.stripe.com');
    const held = await rig.store.get(savedBody.booking_id);
    expect(held?.status).toBe('slot_held');
    expect(Date.parse(held?.expiresAt ?? '') - NOW.getTime()).toBe(CONSULTATION_HOLD_TTL_MS);
    expect(held?.email).toBe('ada@example.com');

    const during = await handleAvailability(
      new Request('https://revealuistudio.com/api/consultation/availability'),
      rig.deps,
    );
    const duringBody = (await during.json()) as { slots: Array<{ start: string }> };
    expect(duringBody.slots.map((item) => item.start)).not.toContain(slot.start);

    const again = await book(rig.deps, slot);
    expect(again.status).toBe(409);

    rig.setNow(new Date(NOW.getTime() + CONSULTATION_HOLD_TTL_MS + 1000));
    const after = await handleAvailability(
      new Request('https://revealuistudio.com/api/consultation/availability'),
      rig.deps,
    );
    const afterBody = (await after.json()) as { slots: Array<{ start: string }> };
    expect(afterBody.slots.map((item) => item.start)).toContain(slot.start);
  });

  it('refuses a public credit flag and does not echo it', async () => {
    const rig = harness();
    const response = await handleBook(
      new Request('https://revealuistudio.com/api/consultation/book', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          start: '2026-09-23T13:00:00.000Z',
          end: '2026-09-23T14:00:00.000Z',
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          waive: true,
        }),
      }),
      rig.deps,
    );
    expect(response.status).toBe(400);
    const raw = await response.text();
    expect(raw).not.toMatch(/waiv/i);
    expect(rig.stripe?.drafts).toEqual([]);
  });
});

describe('consultation checkout session', () => {
  it('sends Consultation quantity and Stage B only when the add-on is on', async () => {
    const off = harness();
    const on = harness();
    const slot = { start: '2026-09-23T13:00:00.000Z', end: '2026-09-23T14:00:00.000Z' };
    const two = { start: '2026-09-23T15:00:00.000Z', end: '2026-09-23T17:00:00.000Z' };

    expect((await book(off.deps, slot, { stage_b: false })).status).toBe(200);
    expect((await book(on.deps, two, { stage_b: true, hours: 2 })).status).toBe(200);

    const plain = off.stripe?.drafts[0];
    const added = on.stripe?.drafts[0];
    expect(plain?.hours).toBe(1);
    expect(plain?.stageB).toBe(false);
    expect(added?.hours).toBe(2);
    expect(added?.stageB).toBe(true);
    if (!plain || !added) return;

    const plainForm = encodeCheckoutForm({
      draft: plain,
      successUrl: 'https://revealuistudio.com/consultation/book/success?booking=1',
      cancelUrl: 'https://revealuistudio.com/consultation/book/cancel?booking=1',
      expiresAtSec: 1_800,
    });
    expect(plainForm.get('mode')).toBe('payment');
    expect(plainForm.get('client_reference_id')).toBe(plain.bookingId);
    expect(plainForm.get('line_items[0][price]')).toBe(CONSULTATION_STRIPE_PRICE_ID);
    expect(plainForm.get('line_items[0][quantity]')).toBe('1');
    expect(plainForm.get('line_items[1][price]')).toBeNull();
    expect(plainForm.get('metadata[booking_id]')).toBe(plain.bookingId);
    expect(plainForm.get('metadata[stage_b]')).toBe('false');
    expect(plainForm.get('metadata[buyer_email]')).toBe('ada@example.com');

    const addedForm = encodeCheckoutForm({
      draft: added,
      successUrl: 'https://revealuistudio.com/consultation/book/success?booking=2',
      cancelUrl: 'https://revealuistudio.com/consultation/book/cancel?booking=2',
      expiresAtSec: 1_800,
    });
    expect(addedForm.get('line_items[0][quantity]')).toBe('2');
    expect(addedForm.get('line_items[1][price]')).toBe(STAGE_B_STRIPE_PRICE_ID);
    expect(addedForm.get('line_items[1][quantity]')).toBe('1');
    expect(addedForm.get('metadata[stage_b]')).toBe('true');
  });
});

describe('consultation webhook', () => {
  it('schedules once when checkout completes and ignores a second delivery', async () => {
    const rig = harness();
    const slot = { start: '2026-09-23T13:00:00.000Z', end: '2026-09-23T14:00:00.000Z' };
    const saved = await book(rig.deps, slot, { stage_b: true });
    const { booking_id: bookingId } = (await saved.json()) as { booking_id: string };
    const draft = rig.stripe?.drafts[0];
    expect(draft?.bookingId).toBe(bookingId);
    if (!draft) return;

    const session = {
      id: 'cs_test_book',
      object: 'checkout.session',
      payment_status: 'paid',
      client_reference_id: bookingId,
      customer_email: 'ada@example.com',
      metadata: consultationCheckoutMetadata(draft),
    };
    const payload = JSON.stringify({
      id: 'evt_paid',
      type: 'checkout.session.completed',
      data: { object: session },
    });

    const first = await handleStripeWebhook(signed(payload), rig.deps);
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ status: 'paid_scheduled' });
    const paid = await rig.store.get(bookingId);
    expect(paid?.status).toBe('paid_scheduled');
    expect(paid?.meetLink).toContain('https://meet.google.com/');
    expect(rig.calendar.confirmCalls).toBe(1);
    expect(rig.calendar.events.find((event) => event.bookingId === bookingId)?.attendee).toBe(
      'ada@example.com',
    );
    expect(rig.desk).toEqual([
      expect.objectContaining({
        bookingId,
        fromStatus: 'consultation_paid',
        toStatus: 'consultation_scheduled',
        meetLink: paid?.meetLink,
      }),
    ]);
    expect(rig.emails).toHaveLength(1);
    expect(rig.emails[0]?.send).toBe(false);
    expect(rig.emails[0]?.meetLink).toBe(paid?.meetLink);
    expect(rig.emails[0]?.paymentNote).toContain('$597');

    const second = await handleStripeWebhook(signed(payload), rig.deps);
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ status: 'duplicate' });
    expect(rig.calendar.confirmCalls).toBe(1);
    expect(rig.desk).toHaveLength(1);
    expect(rig.emails).toHaveLength(1);
  });

  it('does not schedule an unpaid session or a bad signature', async () => {
    const rig = harness();
    const unpaid = JSON.stringify({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_unpaid',
          payment_status: 'unpaid',
          client_reference_id: 'book_missing',
          metadata: { booking_id: 'book_missing' },
        },
      },
    });
    const ignored = await handleStripeWebhook(signed(unpaid), rig.deps);
    expect(ignored.status).toBe(200);
    expect(await ignored.json()).toMatchObject({ ignored: 'unpaid' });

    const bad = signed(unpaid, NOW, 'whsec_other');
    const rejected = await handleStripeWebhook(bad, rig.deps);
    expect(rejected.status).toBe(400);
    expect(rig.calendar.confirmCalls).toBe(0);
    expect(verifyStripeSignature(unpaid, 't=1,v1=00', SECRET, 1)).toBe(false);
  });

  it('schedules from invoice metadata and stays idempotent', async () => {
    const rig = harness();
    const metadata = consultationCheckoutMetadata({
      bookingId: 'book_invoice',
      start: '2026-09-24T13:00:00.000Z',
      end: '2026-09-24T14:00:00.000Z',
      hours: 1,
      stageB: false,
      buyerEmail: 'ada@example.com',
      buyerName: 'Ada Lovelace',
      company: '',
    });
    const payload = JSON.stringify({
      type: 'invoice.paid',
      data: { object: { id: 'in_test_paid', metadata } },
    });
    const first = await handleStripeWebhook(signed(payload), rig.deps);
    expect(first.status).toBe(200);
    expect((await rig.store.get('book_invoice'))?.status).toBe('paid_scheduled');
    const second = await handleStripeWebhook(signed(payload), rig.deps);
    expect(await second.json()).toMatchObject({ status: 'duplicate' });
    expect(rig.calendar.confirmCalls).toBe(1);
    expect(rig.desk).toHaveLength(1);
  });

  it('returns retry while another delivery is still writing the event', async () => {
    const rig = harness();
    const slot = { start: '2026-09-23T16:00:00.000Z', end: '2026-09-23T17:00:00.000Z' };
    const saved = await book(rig.deps, slot);
    const { booking_id: bookingId } = (await saved.json()) as { booking_id: string };
    const draft = rig.stripe?.drafts[0];
    if (!draft) throw new Error('missing draft');
    const payload = JSON.stringify({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_book',
          payment_status: 'paid',
          client_reference_id: bookingId,
          metadata: consultationCheckoutMetadata(draft),
        },
      },
    });

    let release: () => void = () => {};
    let started: () => void = () => {};
    const startedPromise = new Promise<void>((resolve) => {
      started = resolve;
    });
    const original = rig.calendar.confirmPaid.bind(rig.calendar);
    let gated = true;
    rig.calendar.confirmPaid = async (booking) => {
      if (gated) {
        gated = false;
        started();
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
      return original(booking);
    };

    const first = handleStripeWebhook(signed(payload), rig.deps);
    await startedPromise;
    const second = await handleStripeWebhook(signed(payload), rig.deps);
    expect(second.status).toBe(500);
    release();
    const finished = await first;
    expect(finished.status).toBe(200);
    const third = await handleStripeWebhook(signed(payload), rig.deps);
    expect(await third.json()).toMatchObject({ status: 'duplicate' });
    expect(rig.desk).toHaveLength(1);
  });
});
