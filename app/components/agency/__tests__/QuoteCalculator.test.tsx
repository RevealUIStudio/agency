import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuoteCalculator } from '@/components/agency/QuoteCalculator';
import { LAUNCH_PACKAGE, WORKING_SESSION, WRITTEN_PLAN } from '@/lib/engagements';
import { QUOTE_CALCULATOR_LEAD, QUOTE_OWNERSHIP, SELF_HOST_HANDOFF } from '@/lib/quote';
import { INTRO_CALL_URL, PRODUCT_SITE_URL } from '@/lib/site';

describe('QuoteCalculator', () => {
  it('defaults to You will and prints the three Studio quotes', () => {
    render(<QuoteCalculator />);

    expect(screen.getByRole('radio', { name: 'You will (Studio)' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'I will (developer / self-host)' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Launch' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'One business, one place' })).toBeChecked();
    expect(
      screen.getByRole('radio', { name: 'Consultation' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Pilot' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Launch' })).toBeInTheDocument();

    expect(screen.getByText(QUOTE_CALCULATOR_LEAD)).toBeInTheDocument();
    expect(screen.queryByText(/Same tool as the product site/)).not.toBeInTheDocument();
    expect(screen.getByText(WORKING_SESSION.price)).toBeInTheDocument();
    expect(screen.getByText(WRITTEN_PLAN.price)).toBeInTheDocument();
    expect(screen.getByText(LAUNCH_PACKAGE.price)).toBeInTheDocument();
    expect(screen.getByText(LAUNCH_PACKAGE.payment)).toBeInTheDocument();
    expect(screen.getByText('Invoice before we start. No leftover site. No holdback.')).toBeInTheDocument();
    expect(screen.getByText(WRITTEN_PLAN.payment)).toBeInTheDocument();
    expect(screen.queryByText(/four tests/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/first half back/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/keep the stack/i)).not.toBeInTheDocument();
    expect(screen.queryByText('$25,000')).not.toBeInTheDocument();
    expect(screen.queryByText('$50,000')).not.toBeInTheDocument();
    expect(screen.queryByText(/Fleet from/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$49/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$299/)).not.toBeInTheDocument();
  });

  it('keeps ownership lines and the Google Calendar intro on the quote card', () => {
    render(<QuoteCalculator />);
    for (const line of QUOTE_OWNERSHIP) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
    const intro = screen.getByRole('link', { name: 'Book a 30-minute intro' });
    expect(intro).toHaveAttribute('href', INTRO_CALL_URL);
    expect(intro).toHaveAttribute('href', expect.stringContaining('calendar.google.com'));
  });

  it('stops quoting when they pick more than one place', () => {
    render(<QuoteCalculator />);
    fireEvent.click(screen.getByRole('radio', { name: /More than one/ }));
    expect(screen.getByText('Stop quoting. Book an intro.')).toBeInTheDocument();
    expect(screen.queryByText(LAUNCH_PACKAGE.price)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book a 30-minute intro' })).toHaveAttribute(
      'href',
      INTRO_CALL_URL,
    );
  });

  it('sends self-host visitors to the product site instead of quoting product SKUs', () => {
    const { container } = render(<QuoteCalculator />);
    fireEvent.click(screen.getByRole('radio', { name: 'I will (developer / self-host)' }));
    expect(screen.getByText(SELF_HOST_HANDOFF)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start free' })).toHaveAttribute(
      'href',
      PRODUCT_SITE_URL,
    );
    expect(screen.queryByText(LAUNCH_PACKAGE.price)).not.toBeInTheDocument();
    expect(screen.queryByText(LAUNCH_PACKAGE.payment)).not.toBeInTheDocument();
    expect(container.textContent ?? '').not.toMatch(/\$49/);
    expect(container.textContent ?? '').not.toMatch(/\$299/);
    expect(container.textContent ?? '').not.toMatch(/Enterprise/);
    expect(screen.getByRole('link', { name: 'Book a 30-minute intro' })).toHaveAttribute(
      'href',
      INTRO_CALL_URL,
    );
  });
});
