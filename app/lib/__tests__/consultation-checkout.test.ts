import { describe, expect, it } from 'vitest';
import {
  CHECKOUT_BILLING_ADDRESS_COLLECTION,
  consultationCheckoutLines,
  consultationIntegrationIdentifier,
  DEFAULT_CONSULTATION_PRICE_ID,
  DEFAULT_STAGE_B_PRICE_ID,
  encodeCheckoutForm,
  INTEGRATION_IDENTIFIER_PREFIX,
  INTEGRATION_IDENTIFIER_SUFFIX_LENGTH,
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

function countLineItems(params: URLSearchParams): number {
  let count = 0;
  while (params.get(`line_items[${count}][price]`)) count += 1;
  return count;
}

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
    expect(params.get('customer_email')).toBe('ada@example.com');
    expect(params.get('phone_number_collection[enabled]')).toBe('true');
    expect(params.get('billing_address_collection')).toBe(CHECKOUT_BILLING_ADDRESS_COLLECTION);
    expect(params.get('ui_mode')).toBeNull();
    expect(params.get('automatic_tax[enabled]')).toBeNull();
    expect(params.get('allow_promotion_codes')).toBeNull();
  });

  it('omits payment_method_types and keeps booking_id on the Session', () => {
    const hours = 3;
    const lines = consultationCheckoutLines({ hours, stageB: false });
    const params = new URLSearchParams(
      encodeCheckoutForm({
        lines,
        bookingId: 'book_payload',
        start: '2026-01-07T14:00:00.000Z',
        end: '2026-01-07T17:00:00.000Z',
        hours,
        stageB: false,
        buyerEmail: 'ada@example.com',
        buyerName: 'Ada Buyer',
        successUrl: 'https://revealuistudio.com/consultation/book/success?booking=book_payload',
        cancelUrl: 'https://revealuistudio.com/consultation/book/cancel',
        integrationIdentifier: 'consultation_book_abcdefgh',
      }),
    );
    expect(params.has('payment_method_types')).toBe(false);
    expect([...params.keys()].some((key) => key.startsWith('payment_method_types'))).toBe(false);
    expect(params.get('client_reference_id')).toBe('book_payload');
    expect(params.get('metadata[booking_id]')).toBe('book_payload');
    expect(params.get('metadata[hours]')).toBe('3');
    expect(params.get('metadata[start]')).toBe('2026-01-07T14:00:00.000Z');
    expect(params.get('metadata[end]')).toBe('2026-01-07T17:00:00.000Z');
    expect(params.get('metadata[stage_b]')).toBe('false');
    expect(countLineItems(params)).toBe(1);
    expect(params.get('line_items[0][quantity]')).toBe(String(hours));
    expect(params.get('integration_identifier')).toBe('consultation_book_abcdefgh');
  });

  it('adds one Stage B line when the add-on is on', () => {
    const lines = consultationCheckoutLines({ hours: 2, stageB: true });
    const params = new URLSearchParams(
      encodeCheckoutForm({
        lines,
        bookingId: 'book_stage',
        start: '2026-01-07T14:00:00.000Z',
        end: '2026-01-07T16:00:00.000Z',
        hours: 2,
        stageB: true,
        buyerEmail: 'ada@example.com',
        buyerName: 'Ada Buyer',
        successUrl: 'https://revealuistudio.com/consultation/book/success?booking=book_stage',
        cancelUrl: 'https://revealuistudio.com/consultation/book/cancel',
        integrationIdentifier: 'consultation_book_ijklmnop',
      }),
    );
    expect(lines).toHaveLength(2);
    expect(countLineItems(params)).toBe(2);
    expect(params.get('line_items[0][quantity]')).toBe('2');
    expect(params.get('line_items[1][price]')).toBe(DEFAULT_STAGE_B_PRICE_ID);
    expect(params.get('line_items[1][quantity]')).toBe('1');
    expect(params.get('metadata[booking_id]')).toBe('book_stage');
    expect(params.has('payment_method_types')).toBe(false);
  });

  it('mints an 8-letter integration identifier when the caller omits one', () => {
    const id = consultationIntegrationIdentifier();
    expect(id.startsWith(INTEGRATION_IDENTIFIER_PREFIX)).toBe(true);
    expect(id.slice(INTEGRATION_IDENTIFIER_PREFIX.length)).toMatch(
      new RegExp(`^[a-z]{${INTEGRATION_IDENTIFIER_SUFFIX_LENGTH}}$`),
    );
    const params = new URLSearchParams(
      encodeCheckoutForm({
        lines: consultationCheckoutLines({ hours: 1, stageB: false }),
        bookingId: 'book_id',
        start: '2026-01-07T14:00:00.000Z',
        end: '2026-01-07T15:00:00.000Z',
        hours: 1,
        stageB: false,
        buyerEmail: 'ada@example.com',
        buyerName: 'Ada Buyer',
        successUrl: 'https://revealuistudio.com/consultation/book/success?booking=book_id',
        cancelUrl: 'https://revealuistudio.com/consultation/book/cancel',
      }),
    );
    expect(params.get('integration_identifier')).toMatch(/^consultation_book_[a-z]{8}$/);
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
