import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsultationBookPage, ConsultationBookSuccessPage } from '@/routes/ConsultationBookPage';

const previousFetch = globalThis.fetch;

afterEach(() => {
  vi.stubGlobal('fetch', previousFetch);
});

describe('ConsultationBookPage', () => {
  it('saves a slot without Stage B and redirects to Checkout', async () => {
    let posted: unknown;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/api/consultation/availability')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              timezone: 'America/New_York',
              hours: 1,
              slots: [
                {
                  start: '2026-01-07T14:00:00.000Z',
                  end: '2026-01-07T15:00:00.000Z',
                  label: 'Wed, Jan 7 · 9:00 AM–10:00 AM ET',
                },
              ],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        );
      }
      if (url.includes('/api/consultation/book')) {
        posted = JSON.parse(String(init?.body));
        return Promise.resolve(
          new Response(
            JSON.stringify({
              booking_id: 'book_1',
              checkout_url: 'https://checkout.stripe.com/c/pay/cs_test',
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        );
      }
      return Promise.resolve(new Response('no', { status: 500 }));
    });

    const onCheckout = vi.fn();
    const view = render(<ConsultationBookPage onCheckout={onCheckout} />);
    expect(view.container.textContent ?? '').not.toMatch(/waive/i);
    expect(view.container.textContent ?? '').not.toContain('calendar.google.com');
    const stageB = await screen.findByRole('checkbox', { name: 'Add Stage B ($297)' });
    expect(stageB).not.toBeChecked();
    fireEvent.click(await screen.findByRole('radio', { name: /9:00 AM/ }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada Buyer' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue to payment' }));

    await waitFor(() => {
      expect(onCheckout).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test');
    });
    expect(posted).toMatchObject({
      start: '2026-01-07T14:00:00.000Z',
      hours: 1,
      name: 'Ada Buyer',
      email: 'ada@example.com',
      stage_b: false,
    });
  });

  it('shows the payment confirmation line', () => {
    render(<ConsultationBookSuccessPage />);
    expect(
      screen.getByText('Payment received — confirmation email with Meet link shortly'),
    ).toBeInTheDocument();
  });
});
