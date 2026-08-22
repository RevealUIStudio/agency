import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuoteCalculator } from '@/components/agency/QuoteCalculator';
import { LAUNCH_PACKAGE, WORKING_SESSION, WRITTEN_PLAN } from '@/lib/engagements';
import { LAUNCH_HOLDBACK, QUOTE_OWNERSHIP } from '@/lib/quote';
import { INTRO_CALL_URL } from '@/lib/site';

describe('QuoteCalculator', () => {
  it('defaults to You will and prints the three Studio quotes', () => {
    render(<QuoteCalculator />);

    expect(screen.getByRole('radio', { name: 'You will (Studio)' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'I will (developer / self-host)' })).not.toBeChecked();
    expect(
      screen.getByRole('radio', {
        name: 'One live flow on my accounts (site or booking + Stripe)',
      }),
    ).toBeChecked();
    expect(screen.getByRole('radio', { name: 'One business, one site' })).toBeChecked();

    expect(screen.getByText(WORKING_SESSION.price)).toBeInTheDocument();
    expect(screen.getByText(WRITTEN_PLAN.price)).toBeInTheDocument();
    expect(screen.getByText(LAUNCH_PACKAGE.price)).toBeInTheDocument();
    expect(screen.getByText(LAUNCH_HOLDBACK)).toBeInTheDocument();
    expect(screen.getByText('Invoice before we start. No holdback.')).toBeInTheDocument();
    expect(screen.queryByText('$25,000')).not.toBeInTheDocument();
    expect(screen.queryByText('$50,000')).not.toBeInTheDocument();
    expect(screen.queryByText(/Fleet from/)).not.toBeInTheDocument();
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

  it('prints the self-host product quote when they will put it live', () => {
    render(<QuoteCalculator />);
    fireEvent.click(screen.getByRole('radio', { name: 'I will (developer / self-host)' }));
    expect(screen.getByText('Self-host')).toBeInTheDocument();
    expect(screen.getByText(/Pro \$49\/mo or Max \$299\/mo/)).toBeInTheDocument();
    expect(screen.getByText(/Enterprise: not in the calculator/)).toBeInTheDocument();
    expect(screen.queryByText(LAUNCH_HOLDBACK)).not.toBeInTheDocument();
  });
});
