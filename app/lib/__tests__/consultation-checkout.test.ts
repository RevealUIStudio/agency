import { describe, expect, it } from 'vitest';
import {
  consultationCheckoutLines,
  DEFAULT_CONSULTATION_PRICE_ID,
  DEFAULT_STAGE_B_PRICE_ID,
  encodeCheckoutForm,
} from '@/lib/consultation-checkout';

describe('consultationCheckoutLines', () => {
  it('charges the consultation price once per hour when Stage B is off', () => {
    expect(consultationCheckoutLines({ hours: 2, stageB: false })).toEqual([
      { price: DEFAULT_CONSULTATION_PRICE_ID, quantity: 2 },
    ]);
  });

  it('adds the Stage B price when the add-on is on', () => {
    expect(consultationCheckoutLines({ hours: 1, stageB: true })).toEqual([
      { price: DEFAULT_CONSULTATION_PRICE_ID, quantity: 1 },
      { price: DEFAULT_STAGE_B_PRICE_ID, quantity: 1 },
    ]);
  });

  it('rejects an hour count outside 1–8', () => {
    expect(() => consultationCheckoutLines({ hours: 0, stageB: false })).toThrow(
      /consultation-hours/,
    );
  });
});

describe('encodeCheckoutForm', () => {
  it('puts the booking and the slot on the Checkout Session', () => {
    const lines = consultationCheckoutLines({ hours: 2, stageB: false });
    const params = new URLSearchParams(
      encodeCheckoutForm({
        lines,
        bookingId: 'book_1',
        start: '2026-01-07T14:00:00.000Z',
        end: '2026-01-07T16:00:00.000Z',
        hours: 2,
        stageB: false,
        buyerEmail: 'ada@example.com',
        buyerName: 'Ada Buyer',
        successUrl: 'https://revealuistudio.com/consultation/book/success?booking=book_1',
        cancelUrl: 'https://revealuistudio.com/consultation/book/cancel',
      }),
    );
    expect(params.get('mode')).toBe('payment');
    expect(params.get('client_reference_id')).toBe('book_1');
    expect(params.get('line_items[0][price]')).toBe(DEFAULT_CONSULTATION_PRICE_ID);
    expect(params.get('line_items[0][quantity]')).toBe('2');
    expect(params.get('line_items[1][price]')).toBeNull();
    expect(params.get('metadata[booking_id]')).toBe('book_1');
    expect(params.get('metadata[start]')).toBe('2026-01-07T14:00:00.000Z');
    expect(params.get('metadata[end]')).toBe('2026-01-07T16:00:00.000Z');
    expect(params.get('metadata[hours]')).toBe('2');
    expect(params.get('metadata[stage_b]')).toBe('false');
    expect(params.get('metadata[buyer_email]')).toBe('ada@example.com');
    expect(params.get('metadata[buyer_name]')).toBe('Ada Buyer');
  });

  it('marks Stage B in metadata when the second line is present', () => {
    const lines = consultationCheckoutLines({ hours: 1, stageB: true });
    const params = new URLSearchParams(
      encodeCheckoutForm({
        lines,
        bookingId: 'book_2',
        start: '2026-01-07T14:00:00.000Z',
        end: '2026-01-07T15:00:00.000Z',
        hours: 1,
        stageB: true,
        buyerEmail: 'ada@example.com',
        buyerName: 'Ada Buyer',
        successUrl: 'https://revealuistudio.com/consultation/book/success?booking=book_2',
        cancelUrl: 'https://revealuistudio.com/consultation/book/cancel',
      }),
    );
    expect(params.get('line_items[1][price]')).toBe(DEFAULT_STAGE_B_PRICE_ID);
    expect(params.get('line_items[1][quantity]')).toBe('1');
    expect(params.get('metadata[stage_b]')).toBe('true');
  });
});
