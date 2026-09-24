import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONSULTATION_SUCCESS, rememberConsultationReceipt } from '@/lib/consultation-buyer';
import {
  ConsultationBookCancelPage,
  ConsultationBookPage,
  ConsultationBookSuccessPage,
} from '@/routes/ConsultationBookPage';

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
    expect(sessionStorage.getItem('consultation-receipt')).toBeNull();
  });

  it('shows the payment confirmation line', () => {
    render(<ConsultationBookSuccessPage />);
    expect(screen.getByText(CONSULTATION_SUCCESS)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'founder@revealui.com' })).toHaveAttribute(
      'href',
      'mailto:founder@revealui.com',
    );
  });

  it('shows the slot remembered for this booking and hides a different one', () => {
    window.history.pushState({}, '', '/consultation/book/success?booking=book_ux');
    rememberConsultationReceipt('book_ux', {
      label: 'Wed, Jan 7 · 9:00 AM–10:00 AM ET',
      stageB: false,
    });
    const matched = render(<ConsultationBookSuccessPage />);
    expect(screen.getByText('Wed, Jan 7 · 9:00 AM–10:00 AM ET')).toBeInTheDocument();
    expect(screen.getByText('This payment is the consultation only.')).toBeInTheDocument();
    matched.unmount();

    window.history.pushState({}, '', '/consultation/book/success?booking=other');
    render(<ConsultationBookSuccessPage />);
    expect(screen.queryByText('Wed, Jan 7 · 9:00 AM–10:00 AM ET')).not.toBeInTheDocument();
    window.history.pushState({}, '', '/');
    sessionStorage.removeItem('consultation-receipt');
  });

  it('keeps the pay control and fields full width for a narrow viewport', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(JSON.stringify({ timezone: 'America/New_York', hours: 1, slots: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    render(<ConsultationBookPage />);
    const pay = await screen.findByRole('button', { name: 'Continue to payment' });
    expect(pay.className).toContain('w-full');
    expect(pay.className).toContain('min-h-12');
    expect(pay.closest('.fixed')?.className).toContain('bottom-[var(--cookie-banner-height,0px)]');
    expect(screen.getByLabelText('Company (optional)')).toBeInTheDocument();
    const name = screen.getByLabelText('Name');
    expect(name.className).toContain('w-full');
    expect(name.className).toContain('text-base');
    expect(screen.getByRole('checkbox', { name: 'Add Stage B ($297)' })).not.toBeChecked();
    expect(
      await screen.findByText('No open slots for 1 hour in the next 3 weeks.'),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Consultation length'), { target: { value: '2' } });
    expect(
      await screen.findByText('No open slots for 2 hours in the next 3 weeks.'),
    ).toBeInTheDocument();
  });

  it('keeps a device-width viewport on the studio document', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    expect(html).toContain('name="viewport"');
    expect(html).toContain('width=device-width');
  });
});

describe('ConsultationBookCancelPage', () => {
  it('offers a full-width return to the book page', () => {
    render(<ConsultationBookCancelPage />);
    const again = screen.getByRole('link', { name: 'Pick another time' });
    expect(again).toHaveAttribute('href', '/consultation/book');
    expect(again.className).toContain('w-full');
    expect(again.className).toContain('min-h-12');
  });
});
