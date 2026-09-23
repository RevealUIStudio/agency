import '@testing-library/jest-dom/vitest';
import { Router, RouterProvider } from '@revealui/router';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BOOK_EMPTY,
  BOOK_PAGE_HEADING,
  BOOK_PAGE_LEAD,
  BOOK_UNAVAILABLE,
  CANCEL_BODY,
  SUCCESS_BODY,
} from '@/lib/consultation-book';
import { INTRO_CALL_URL } from '@/lib/site';
import { ConsultationBookCancelPage } from '@/routes/ConsultationBookCancelPage';
import { ConsultationBookPage } from '@/routes/ConsultationBookPage';
import { ConsultationBookSuccessPage } from '@/routes/ConsultationBookSuccessPage';

const SLOT = {
  start: '2026-09-24T13:00:00.000Z',
  end: '2026-09-24T14:00:00.000Z',
  label: '9:00 AM - 10:00 AM EDT',
  dayLabel: 'Thu, Sep 24',
};

afterEach(() => {
  cleanup();
});

function mockFetch(slots: unknown[] | null, book?: { status: number; body: unknown }) {
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('/api/consultation/availability')) {
      if (!slots) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'calendar-unconfigured' }), { status: 503 }),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({ timezone: 'America/New_York', slotMinutes: 60, hours: 1, slots }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      );
    }
    if (url.includes('/api/consultation/book')) {
      expect(init?.method).toBe('POST');
      return Promise.resolve(
        new Response(
          JSON.stringify(
            book?.body ?? {
              checkout_url: 'https://checkout.stripe.com/c/pay/cs_test_book',
              booking_id: 'book_1',
            },
          ),
          {
            status: book?.status ?? 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      );
    }
    return Promise.reject(new Error(`unexpected ${url}`));
  });
}

function renderBook(go = vi.fn()) {
  const router = new Router();
  router.registerRoutes([
    { path: '/', component: () => null },
    { path: '/consultation/book', component: ConsultationBookPage },
    { path: '/consultation/book/success', component: ConsultationBookSuccessPage },
    { path: '/consultation/book/cancel', component: ConsultationBookCancelPage },
  ]);
  window.history.pushState({}, '', '/consultation/book');
  const view = render(
    <RouterProvider router={router}>
      <ConsultationBookPage go={go} />
    </RouterProvider>,
  );
  return { go, ...view };
}

describe('Consultation book page', () => {
  beforeEach(() => {
    mockFetch([SLOT]);
  });

  it('lists a 60-minute slot and keeps Stage B off', async () => {
    const { container } = renderBook();
    expect(await screen.findByRole('radio', { name: SLOT.label })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: BOOK_PAGE_HEADING })).toBeInTheDocument();
    expect(screen.getByText(BOOK_PAGE_LEAD)).toBeInTheDocument();
    const stageB = screen.getByRole('checkbox', { name: /Add Stage B/ });
    expect(stageB).not.toBeChecked();
    expect(container.textContent ?? '').not.toMatch(/waiv/i);
    expect(container.textContent ?? '').not.toMatch(/free consultation/i);
    expect(container.textContent ?? '').not.toMatch(/sometimes free/i);
    expect(container.querySelector(`a[href="${INTRO_CALL_URL}"]`)).toBeNull();
    expect(container.querySelector('a[href*="calendar.google.com"]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Continue to payment' })).toBeDisabled();
  });

  it('saves the slot and redirects to Checkout', async () => {
    const { go } = renderBook();
    fireEvent.click(await screen.findByRole('radio', { name: SLOT.label }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada Lovelace' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Analytical Engines' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue to payment' }));
    await vi.waitFor(() => {
      expect(go).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_book');
    });
  });

  it('shows an empty range and a calendar outage without a fee claim', async () => {
    cleanup();
    mockFetch([]);
    const empty = renderBook();
    expect(await screen.findByText(BOOK_EMPTY)).toBeInTheDocument();
    empty.unmount();

    mockFetch(null);
    renderBook();
    expect(await screen.findByRole('alert')).toHaveTextContent(BOOK_UNAVAILABLE);
  });
});

describe('Consultation book result pages', () => {
  it('tells the buyer payment was received and the Meet link follows', () => {
    const router = new Router();
    router.registerRoutes([
      { path: '/consultation/book/success', component: ConsultationBookSuccessPage },
      { path: '/consultation/book', component: ConsultationBookPage },
    ]);
    window.history.pushState({}, '', '/consultation/book/success');
    const { container } = render(
      <RouterProvider router={router}>
        <ConsultationBookSuccessPage />
      </RouterProvider>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Payment received' })).toBeInTheDocument();
    expect(screen.getByText(SUCCESS_BODY)).toBeInTheDocument();
    expect(container.textContent ?? '').not.toMatch(/waiv|free consultation/i);
    expect(screen.getByRole('link', { name: 'Back to booking' })).toHaveAttribute(
      'href',
      '/consultation/book',
    );
  });

  it('lets a canceled checkout pick another time', () => {
    const router = new Router();
    router.registerRoutes([
      { path: '/consultation/book/cancel', component: ConsultationBookCancelPage },
      { path: '/consultation/book', component: ConsultationBookPage },
    ]);
    window.history.pushState({}, '', '/consultation/book/cancel');
    render(
      <RouterProvider router={router}>
        <ConsultationBookCancelPage />
      </RouterProvider>,
    );
    expect(screen.getByText(CANCEL_BODY)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pick another time' })).toHaveAttribute(
      'href',
      '/consultation/book',
    );
  });
});
