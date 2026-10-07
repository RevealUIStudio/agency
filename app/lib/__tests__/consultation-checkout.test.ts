import { describe, expect, it } from 'vitest';
import {
  ADAPTER_LOOKUP_KEY,
  CHECKOUT_BILLING_ADDRESS_COLLECTION,
  CheckoutDiscountError,
  consultationCheckoutDescription,
  consultationCheckoutLines,
  consultationIntegrationIdentifier,
  consultationPriceDataLine,
  DEFAULT_ADAPTER_PRICE_ID,
  DEFAULT_STAGE_B_PRICE_ID,
  domainAddOnCheckoutDescription,
  domainAddOnPriceDataLine,
  encodeCheckoutForm,
  INTEGRATION_IDENTIFIER_PREFIX,
  INTEGRATION_IDENTIFIER_SUFFIX_LENGTH,
} from '@/lib/consultation-checkout';

const RETIRED_CHECKOUT_COPY = /Stage B|Proof Sprint|Not an hourly SKU/;

describe('consultationCheckoutLines', () => {
  it('charges the consultation price once per hour when the domain add-on is off', () => {
    expect(consultationCheckoutLines({ hours: 2, stageB: false })).toEqual([
      consultationPriceDataLine(2),
    ]);
  });

  it('adds domain add-on price data when the add-on is on', () => {
    expect(consultationCheckoutLines({ hours: 1, stageB: true })).toEqual([
      consultationPriceDataLine(1),
      domainAddOnPriceDataLine(),
    ]);
  });

  it.each([1, 2, 8])('charges %i hours times $300 with and without the domain add-on', (hours) => {
    const plain = consultationCheckoutLines({ hours, stageB: false });
    expect(plain).toEqual([consultationPriceDataLine(hours)]);
    const consultation = plain[0];
    if (!consultation || !('priceData' in consultation)) throw new Error('consultation line');
    expect(consultation.quantity).toBe(hours);
    expect(consultation.priceData.unitAmount).toBe(30_000);
    expect(consultation.priceData.unitAmount * consultation.quantity).toBe(30_000 * hours);
    expect(consultation.priceData.productData.name).toBe('Consultation');
    expect(consultation.priceData.productData.description).toBe(
      consultationCheckoutDescription(hours),
    );
    expect(consultation.priceData.productData.description).toBe(
      `$300 per hour, ${hours} ${hours === 1 ? 'hour' : 'hours'}`,
    );

    const withDomain = consultationCheckoutLines({ hours, stageB: true });
    expect(withDomain).toEqual([consultationPriceDataLine(hours), domainAddOnPriceDataLine()]);
    const domain = withDomain[1];
    if (!domain || !('priceData' in domain)) throw new Error('domain line');
    expect(domain.quantity).toBe(1);
    expect(domain.priceData.unitAmount).toBe(29_700);
    expect(domain.priceData.productData).toEqual({
      name: 'Domain add-on',
      description: 'Custom domain setup, $297. Included at Pilot and Launch.',
    });
    expect(domainAddOnCheckoutDescription()).toBe(domain.priceData.productData.description);

    const params = new URLSearchParams(
      encodeCheckoutForm({
        lines: withDomain,
        bookingId: `book_${hours}`,
        start: '2026-01-07T14:00:00.000Z',
        end: '2026-01-07T15:00:00.000Z',
        hours,
        stageB: true,
        buyerEmail: 'ada@example.com',
        buyerName: 'Ada Buyer',
        successUrl: 'https://revealuistudio.com/consultation/book/success',
        cancelUrl: 'https://revealuistudio.com/consultation/book/cancel',
      }),
    );
    expect(params.get('line_items[0][price]')).toBeNull();
    expect(params.get('line_items[0][quantity]')).toBe(String(hours));
    expect(params.get('line_items[0][price_data][currency]')).toBe('usd');
    expect(params.get('line_items[0][price_data][unit_amount]')).toBe('30000');
    expect(params.get('line_items[0][price_data][product_data][name]')).toBe('Consultation');
    expect(params.get('line_items[0][price_data][product_data][description]')).toBe(
      `$300 per hour, ${hours} ${hours === 1 ? 'hour' : 'hours'}`,
    );
    expect(params.get('line_items[1][price]')).toBeNull();
    expect(params.get('line_items[1][quantity]')).toBe('1');
    expect(params.get('line_items[1][price_data][unit_amount]')).toBe('29700');
    expect(params.get('line_items[1][price_data][product_data][name]')).toBe('Domain add-on');
    expect(params.get('line_items[1][price_data][product_data][description]')).toBe(
      'Custom domain setup, $297. Included at Pilot and Launch.',
    );
    expect(params.toString()).not.toMatch(RETIRED_CHECKOUT_COPY);
    const plainParams = new URLSearchParams(
      encodeCheckoutForm({
        lines: plain,
        bookingId: `book_plain_${hours}`,
        start: '2026-01-07T14:00:00.000Z',
        end: '2026-01-07T15:00:00.000Z',
        hours,
        stageB: false,
        buyerEmail: 'ada@example.com',
        buyerName: 'Ada Buyer',
        successUrl: 'https://revealuistudio.com/consultation/book/success',
        cancelUrl: 'https://revealuistudio.com/consultation/book/cancel',
      }),
    );
    expect(plainParams.get('line_items[1][quantity]')).toBeNull();
    expect(plainParams.get('line_items[0][quantity]')).toBe(String(hours));
    expect(Number(plainParams.get('line_items[0][price_data][unit_amount]')) * hours).toBe(
      30_000 * hours,
    );
    expect(plainParams.toString()).not.toMatch(RETIRED_CHECKOUT_COPY);
  });

  it('rejects an hour count outside 1–8', () => {
    expect(() => consultationCheckoutLines({ hours: 0, stageB: false })).toThrow(
      /consultation-hours/,
    );
  });

  it('refuses the Adapter price on Consultation checkout', () => {
    expect(() =>
      consultationCheckoutLines({
        hours: 1,
        stageB: false,
        consultationPriceId: DEFAULT_ADAPTER_PRICE_ID,
      }),
    ).toThrow(/adapter-not-on-consultation-checkout/);
    expect(() =>
      consultationCheckoutLines({
        hours: 1,
        stageB: true,
        stageBPriceId: DEFAULT_ADAPTER_PRICE_ID,
      }),
    ).toThrow(/adapter-not-on-consultation-checkout/);
    const lines = consultationCheckoutLines({ hours: 1, stageB: true });
    expect(lines.some((line) => 'price' in line && line.price === DEFAULT_ADAPTER_PRICE_ID)).toBe(
      false,
    );
    expect(ADAPTER_LOOKUP_KEY).toBe('studio_adapter');
    expect(DEFAULT_ADAPTER_PRICE_ID).toBe('price_1UJqwUJz64n6uEibb00OrqFM');
  });
});

function countLineItems(params: URLSearchParams): number {
  let count = 0;
  while (
    params.get(`line_items[${count}][price]`) ||
    params.get(`line_items[${count}][price_data][currency]`)
  ) {
    count += 1;
  }
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
    expect(params.get('line_items[0][price]')).toBeNull();
    expect(params.get('line_items[0][price_data][product_data][name]')).toBe('Consultation');
    expect(params.get('line_items[0][price_data][unit_amount]')).toBe('30000');
    expect(params.get('line_items[0][quantity]')).toBe('2');
    expect(params.get('line_items[1][price]')).toBeNull();
    expect(params.get('line_items[1][price_data][currency]')).toBeNull();
    expect(params.get('metadata[booking_id]')).toBe('book_1');
    expect(params.get('metadata[start]')).toBe('2026-01-07T14:00:00.000Z');
    expect(params.get('metadata[end]')).toBe('2026-01-07T16:00:00.000Z');
    expect(params.get('metadata[hours]')).toBe('2');
    expect(params.get('metadata[stage_b]')).toBe('false');
    expect(params.get('metadata[stage_b_fee]')).toBe('none');
    expect(params.get('metadata[buyer_email]')).toBe('ada@example.com');
    expect(params.get('metadata[buyer_name]')).toBe('Ada Buyer');
    expect(params.get('metadata[company]')).toBeNull();
    expect(params.get('customer_email')).toBe('ada@example.com');
    expect(params.get('phone_number_collection[enabled]')).toBe('true');
    expect(params.get('billing_address_collection')).toBe(CHECKOUT_BILLING_ADDRESS_COLLECTION);
    expect(params.get('ui_mode')).toBeNull();
    expect(params.get('automatic_tax[enabled]')).toBeNull();
    expect(params.get('allow_promotion_codes')).toBeNull();
    expect([...params.keys()].some((key) => key.startsWith('discounts'))).toBe(false);
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
    expect(params.get('line_items[1][price]')).toBeNull();
    expect(params.get('line_items[1][price_data][product_data][name]')).toBe('Domain add-on');
    expect(params.get('line_items[1][price_data][product_data][description]')).toBe(
      'Custom domain setup, $297. Included at Pilot and Launch.',
    );
    expect(params.get('line_items[1][quantity]')).toBe('1');
    expect(params.get('metadata[booking_id]')).toBe('book_stage');
    expect(params.toString()).not.toMatch(RETIRED_CHECKOUT_COPY);
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
        company: 'Example Co',
        successUrl: 'https://revealuistudio.com/consultation/book/success?booking=book_2',
        cancelUrl: 'https://revealuistudio.com/consultation/book/cancel',
      }),
    );
    expect(params.get('line_items[1][price]')).toBeNull();
    expect(params.get('line_items[1][price_data][product_data][name]')).toBe('Domain add-on');
    expect(params.get('line_items[1][quantity]')).toBe('1');
    expect(params.get('metadata[stage_b]')).toBe('true');
    expect(params.get('metadata[stage_b_fee]')).toBe('paid_addon');
    expect(params.get('metadata[company]')).toBe('Example Co');
    expect([...params.keys()].some((key) => key.startsWith('discounts'))).toBe(false);
  });

  it('adds the Stage B coupon only when the fee mode is waived_network', () => {
    const lines = consultationCheckoutLines({
      hours: 2,
      stageB: true,
      stageBFee: 'waived_network',
    });
    const params = new URLSearchParams(
      encodeCheckoutForm({
        lines,
        bookingId: 'book_net',
        start: '2026-01-07T14:00:00.000Z',
        end: '2026-01-07T16:00:00.000Z',
        hours: 2,
        stageB: true,
        stageBFee: 'waived_network',
        stageBNetworkCouponId: 'stage_b_network_credit',
        networkJti: 'jti-net',
        buyerEmail: 'ada@example.com',
        buyerName: 'Ada Buyer',
        successUrl: 'https://revealuistudio.com/consultation/book/success?booking=book_net',
        cancelUrl: 'https://revealuistudio.com/consultation/book/cancel',
      }),
    );
    expect(params.get('line_items[0][price]')).toBeNull();
    expect(params.get('line_items[0][price_data][product_data][name]')).toBe('Consultation');
    expect(params.get('line_items[0][quantity]')).toBe('2');
    expect(params.get('line_items[1][price]')).toBe(DEFAULT_STAGE_B_PRICE_ID);
    expect(params.get('line_items[1][quantity]')).toBe('1');
    expect(params.get('discounts[0][coupon]')).toBe('stage_b_network_credit');
    expect(params.get('metadata[stage_b]')).toBe('true');
    expect(params.get('metadata[stage_b_fee]')).toBe('waived_network');
    expect(params.get('metadata[network_jti]')).toBe('jti-net');
  });

  it('refuses a network fee when the coupon id is missing', () => {
    const lines = consultationCheckoutLines({ hours: 1, stageB: true });
    expect(() =>
      encodeCheckoutForm({
        lines,
        bookingId: 'book_missing',
        start: '2026-01-07T14:00:00.000Z',
        end: '2026-01-07T15:00:00.000Z',
        hours: 1,
        stageB: true,
        stageBFee: 'waived_network',
        buyerEmail: 'ada@example.com',
        buyerName: 'Ada Buyer',
        successUrl: 'https://revealuistudio.com/consultation/book/success?booking=book_missing',
        cancelUrl: 'https://revealuistudio.com/consultation/book/cancel',
      }),
    ).toThrow(CheckoutDiscountError);
  });

  it('does not apply a coupon id on the stranger Stage B line', () => {
    const lines = consultationCheckoutLines({ hours: 1, stageB: true });
    const params = new URLSearchParams(
      encodeCheckoutForm({
        lines,
        bookingId: 'book_stranger',
        start: '2026-01-07T14:00:00.000Z',
        end: '2026-01-07T15:00:00.000Z',
        hours: 1,
        stageB: true,
        stageBFee: 'paid_addon',
        stageBNetworkCouponId: 'stage_b_network_credit',
        buyerEmail: 'ada@example.com',
        buyerName: 'Ada Buyer',
        successUrl: 'https://revealuistudio.com/consultation/book/success?booking=book_stranger',
        cancelUrl: 'https://revealuistudio.com/consultation/book/cancel',
      }),
    );
    expect(params.get('line_items[1][price]')).toBeNull();
    expect(params.get('line_items[1][price_data][product_data][name]')).toBe('Domain add-on');
    expect(params.get('metadata[stage_b_fee]')).toBe('paid_addon');
    expect([...params.keys()].some((key) => key.startsWith('discounts'))).toBe(false);
  });
});
