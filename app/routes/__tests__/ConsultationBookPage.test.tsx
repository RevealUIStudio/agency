import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CONSULTATION_CHANGE_POLICY,
  CONSULTATION_SUCCESS,
  NETWORK_LINK_USED,
  rememberConsultationReceipt,
} from '@/lib/consultation-buyer';
import { CONSULTATION_DELIVERABLE } from '@/lib/engagements';
import {
  ConsultationBookCancelPage,
  ConsultationBookPage,
  ConsultationBookSuccessPage,
} from '@/routes/ConsultationBookPage';

const previousFetch = globalThis.fetch;

afterEach(() => {
  vi.stubGlobal('fetch', previousFetch);
  window.history.pushState({}, '', '/');
});

describe('ConsultationBookPage', () => {
  it('renders booking chrome from presentation and does not handroll slot radios', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/routes/ConsultationBookPage.tsx'),
      'utf8',
    );
    expect(source).toContain("from '@revealui/presentation'");
    expect(source).toContain('<BookingCalendar');
    expect(source).toContain('<FormField');
    expect(source).toContain('<Select');
    expect(source).toContain('<Input');
    expect(source).toContain('<Checkbox');
    expect(source).toContain('<Button');
    expect(source).toContain('<LinkButton');
    expect(source).not.toMatch(/<button\b/);
    expect(source).not.toMatch(/<select\b/);
    expect(source).not.toMatch(/<input\b/);
    expect(source).not.toMatch(/type="radio"/);
  });

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
    expect(view.container.querySelector('[data-slot="booking-calendar"]')).toBeTruthy();
    expect(screen.getByText(CONSULTATION_DELIVERABLE)).toBeInTheDocument();
    expect(view.container.textContent ?? '').not.toMatch(/waive/i);
    for (const policy of CONSULTATION_CHANGE_POLICY)
      expect(screen.getByText(policy)).toBeInTheDocument();
    expect(view.container.textContent ?? '').not.toContain('calendar.google.com');
    const stageB = await screen.findByRole('checkbox', { name: 'Add the domain pack ($297)' });
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

  it('forces the domain pack on a signed link and keeps due at the consultation', async () => {
    window.history.pushState({}, '', '/consultation/book?nw=signed-token&hours=1');
    let posted: unknown;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/api/consultation/network-status')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              ok: true,
              expires_at: '2026-01-09T15:00:00.000Z',
              email_hint: 'a***@example.com',
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        );
      }
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
              booking_id: 'book_net',
              checkout_url: 'https://checkout.stripe.com/c/pay/cs_net',
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        );
      }
      return Promise.resolve(new Response('no', { status: 500 }));
    });

    const view = render(<ConsultationBookPage onCheckout={vi.fn()} />);
    expect(window.location.search).toBe('?hours=1');
    expect(await screen.findByText('Domain pack is on this order.')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Add the domain pack ($297)' })).toBeNull();
    expect(screen.getByText('Due today $300.')).toBeInTheDocument();
    expect(view.container.textContent ?? '').not.toMatch(
      /\bwaiv(e|ed)\b|\bfree Stage B\b|\bsometimes free\b/i,
    );
    fireEvent.click(await screen.findByRole('radio', { name: /9:00 AM/ }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada Buyer' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue to payment' }));
    await waitFor(() => {
      expect(posted).toMatchObject({
        stage_b: true,
        network_token: 'signed-token',
        hours: 1,
      });
    });
    window.history.pushState({}, '', '/');
  });

  it('keeps a signed link after URL scrubbing and a page remount', async () => {
    window.history.pushState({}, '', '/consultation/book?nw=signed-token&hours=2');
    const statusRequests: string[] = [];
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/api/consultation/network-status')) {
        statusRequests.push(url);
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      return Promise.resolve(
        new Response(JSON.stringify({ slots: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    });
    const first = render(<ConsultationBookPage />);
    expect(await screen.findByText('Domain pack is on this order.')).toBeInTheDocument();
    expect(window.location.search).toBe('?hours=2');
    first.unmount();

    render(<ConsultationBookPage />);
    expect(await screen.findByText('Domain pack is on this order.')).toBeInTheDocument();
    expect(statusRequests).toEqual([
      '/api/consultation/network-status?nw=signed-token',
      '/api/consultation/network-status?nw=signed-token',
    ]);
  });

  it('keeps the optional pack when the signed link does not verify', async () => {
    window.history.pushState({}, '', '/consultation/book?nw=tampered');
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/api/consultation/network-status')) {
        return Promise.resolve(
          new Response(JSON.stringify({ ok: false }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ timezone: 'America/New_York', hours: 1, slots: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    });
    render(<ConsultationBookPage />);
    expect(
      await screen.findByRole('checkbox', { name: 'Add the domain pack ($297)' }),
    ).not.toBeChecked();
    expect(screen.queryByText('Domain pack is on this order.')).not.toBeInTheDocument();
    expect(screen.getByText('Due today $300.')).toBeInTheDocument();
    window.history.pushState({}, '', '/');
  });

  it('does not confirm a payment from a direct URL or browser receipt', () => {
    window.history.pushState({}, '', '/consultation/book/success?booking=book_ux');
    rememberConsultationReceipt('book_ux', { label: 'Unverified local slot', stageB: false });
    render(<ConsultationBookSuccessPage />);
    expect(screen.queryByText(CONSULTATION_SUCCESS)).not.toBeInTheDocument();
    expect(screen.queryByText('Unverified local slot')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('could not verify');
    window.history.pushState({}, '', '/');
    sessionStorage.removeItem('consultation-receipt');
  });

  it('shows payment and schedule only after the server confirms them', async () => {
    window.history.pushState(
      {},
      '',
      '/consultation/book/success?booking=book_ux&session_id=cs_test_1',
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 'confirmed',
            start: '2026-01-07T14:00:00.000Z',
            end: '2026-01-07T15:00:00.000Z',
            stage_b: false,
          }),
        ),
      ),
    );
    render(<ConsultationBookSuccessPage />);
    expect(await screen.findByRole('heading', { name: 'Consultation booked' })).toBeInTheDocument();
    expect(screen.getByText(CONSULTATION_SUCCESS)).toBeInTheDocument();
    expect(screen.getByText(CONSULTATION_DELIVERABLE)).toBeInTheDocument();
    expect(window.location.search).not.toContain('cs_test_1');
    window.history.pushState({}, '', '/');
  });

  it('does not turn a pending payment or failed lookup into a confirmation', async () => {
    window.history.pushState(
      {},
      '',
      '/consultation/book/success?booking=book_ux&session_id=cs_test_1',
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'pending' }))),
    );
    const pending = render(<ConsultationBookSuccessPage />);
    expect(await screen.findByText(/Your booking is not confirmed yet/)).toBeInTheDocument();
    expect(screen.queryByText(CONSULTATION_SUCCESS)).not.toBeInTheDocument();
    expect(screen.queryByText(CONSULTATION_DELIVERABLE)).not.toBeInTheDocument();
    pending.unmount();
    window.history.pushState(
      {},
      '',
      '/consultation/book/success?booking=unknown&session_id=cs_test_1',
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 })));
    render(<ConsultationBookSuccessPage />);
    expect(await screen.findByText(/We could not verify a booking/)).toBeInTheDocument();
    window.history.pushState({}, '', '/');
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
    const stageB = screen.getByRole('checkbox', { name: 'Add the domain pack ($297)' });
    expect(stageB).not.toBeChecked();
    fireEvent.click(stageB);
    expect(stageB).toBeChecked();
    expect(screen.getByText('Due today $597.')).toBeInTheDocument();
    expect(
      await screen.findByText('No open slots for 1 hour in the next 3 weeks.'),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Consultation length'), { target: { value: '2' } });
    expect(
      await screen.findByText('No open slots for 2 hours in the next 3 weeks.'),
    ).toBeInTheDocument();
  });

  it('shows the unconfigured calendar state when booking is not set up', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(JSON.stringify({ error: 'calendar-unconfigured' }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    render(<ConsultationBookPage />);
    expect(
      await screen.findByText('Booking is not available on this server yet.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.getByRole('button', { name: 'Continue to payment' })).toBeDisabled();
  });

  it('retries a failed slot load from the presentation button', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', () => {
      calls += 1;
      if (calls === 1) return Promise.resolve(new Response('no', { status: 500 }));
      return Promise.resolve(
        new Response(JSON.stringify({ timezone: 'America/New_York', hours: 1, slots: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    });
    render(<ConsultationBookPage />);
    expect(await screen.findByText('Could not load open slots.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByText('No open slots for 1 hour in the next 3 weeks.'),
    ).toBeInTheDocument();
    expect(calls).toBeGreaterThan(1);
  });

  it('shows the used-link message when a network Consultation link is already redeemed', async () => {
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
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
        return Promise.resolve(
          new Response(JSON.stringify({ error: 'network-redeemed', message: NETWORK_LINK_USED }), {
            status: 409,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }
      return Promise.resolve(new Response('no', { status: 500 }));
    });
    render(<ConsultationBookPage />);
    fireEvent.click(await screen.findByRole('radio', { name: /9:00 AM/ }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada Buyer' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue to payment' }));
    expect(await screen.findByText(NETWORK_LINK_USED)).toBeInTheDocument();
    expect(screen.queryByText('That slot was just taken. Pick another.')).toBeNull();
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
