import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuoteCalculator } from '@/components/agency/QuoteCalculator';
import { CONSULTATION, LAUNCH, PROOF_SPRINT } from '@/lib/engagements';
import {
  CONSULTATION_QUOTE_DETAIL,
  HOSTER_OPTIONS,
  INTRO_HEADING,
  LAUNCH_QUOTE_DETAIL,
  OUTCOME_OPTIONS,
  PLACES_OPTIONS,
  PROOF_QUOTE_DETAIL,
  QUOTE_CALCULATOR_HEADING,
  QUOTE_CALCULATOR_LEAD,
  QUOTE_OWNERSHIP,
  SELF_HOST_HANDOFF,
} from '@/lib/quote';
import { CONSULTATION_BOOK_PATH, INTRO_CALL_URL, PRODUCT_SITE_URL } from '@/lib/site';

describe('QuoteCalculator', () => {
  it('defaults to Studio implements with me and prints the three Studio quotes', () => {
    render(<QuoteCalculator />);

    expect(
      screen.getByRole('heading', { level: 2, name: QUOTE_CALCULATOR_HEADING }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: HOSTER_OPTIONS[1].label })).toBeChecked();
    expect(screen.getByRole('radio', { name: HOSTER_OPTIONS[0].label })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: OUTCOME_OPTIONS[1].label })).toBeChecked();
    expect(screen.getByRole('radio', { name: OUTCOME_OPTIONS[2].label })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: PLACES_OPTIONS[0].label })).toBeChecked();
    expect(screen.getByRole('radio', { name: OUTCOME_OPTIONS[0].label })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: OUTCOME_OPTIONS[1].label })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: OUTCOME_OPTIONS[2].label })).toBeInTheDocument();

    expect(screen.getByText(QUOTE_CALCULATOR_LEAD)).toBeInTheDocument();
    expect(QUOTE_CALCULATOR_LEAD).toMatch(/PROOF means a receipted action/);
    expect(QUOTE_CALCULATOR_LEAD).toMatch(/not outcome validation or proof of work/);
    expect(screen.queryByText(/Same tool as the product site/)).not.toBeInTheDocument();
    expect(screen.getByText(CONSULTATION.price)).toBeInTheDocument();
    expect(screen.getByText(PROOF_SPRINT.price)).toBeInTheDocument();
    expect(screen.getByText(LAUNCH.price)).toBeInTheDocument();
    expect(screen.getByText(CONSULTATION_QUOTE_DETAIL)).toBeInTheDocument();
    expect(screen.getByText(PROOF_QUOTE_DETAIL)).toBeInTheDocument();
    expect(screen.getByText(LAUNCH_QUOTE_DETAIL)).toBeInTheDocument();
    expect(screen.queryByText(PROOF_SPRINT.payment)).not.toBeInTheDocument();
    expect(screen.queryByText(/four tests/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/first half back/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/keep the stack/i)).not.toBeInTheDocument();
    expect(screen.queryByText('$25,000')).not.toBeInTheDocument();
    expect(screen.queryByText('$50,000')).not.toBeInTheDocument();
    expect(screen.queryByText(/Fleet from/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$49/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$99/)).not.toBeInTheDocument();
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
    expect(screen.getByRole('link', { name: 'Book a Consultation' })).toHaveAttribute(
      'href',
      CONSULTATION_BOOK_PATH,
    );
  });

  it('stops quoting when they pick more than one site', () => {
    render(<QuoteCalculator />);
    fireEvent.click(screen.getByRole('radio', { name: /More than one/ }));
    expect(screen.getByText(INTRO_HEADING)).toBeInTheDocument();
    expect(screen.queryByText(LAUNCH.price)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book a 30-minute intro' })).toHaveAttribute(
      'href',
      INTRO_CALL_URL,
    );
    expect(screen.queryByRole('link', { name: 'Book a Consultation' })).not.toBeInTheDocument();
  });

  it('sends self-host visitors to the product site instead of quoting product SKUs', () => {
    const { container } = render(<QuoteCalculator />);
    fireEvent.click(screen.getByRole('radio', { name: HOSTER_OPTIONS[0].label }));
    expect(screen.getByText(SELF_HOST_HANDOFF)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start free' })).toHaveAttribute(
      'href',
      PRODUCT_SITE_URL,
    );
    expect(screen.queryByText(LAUNCH.price)).not.toBeInTheDocument();
    expect(screen.queryByText(LAUNCH_QUOTE_DETAIL)).not.toBeInTheDocument();
    expect(container.textContent ?? '').not.toMatch(/\$49/);
    expect(container.textContent ?? '').not.toMatch(/\$99/);
    expect(container.textContent ?? '').not.toMatch(/\$299/);
    expect(container.textContent ?? '').not.toMatch(/Enterprise/);
    expect(screen.getByRole('link', { name: 'Book a 30-minute intro' })).toHaveAttribute(
      'href',
      INTRO_CALL_URL,
    );
    expect(screen.queryByRole('link', { name: 'Book a Consultation' })).not.toBeInTheDocument();
  });

  it('multiplies Consultation by the hours dropdown and does not name a separate SKU', () => {
    const { container } = render(<QuoteCalculator />);
    const hours = screen.getByLabelText('Consultation hours');
    expect(hours).toHaveValue('1');
    fireEvent.change(hours, { target: { value: '4' } });
    expect(screen.getByText('$1,200')).toBeInTheDocument();
    expect(container.textContent ?? '').not.toMatch(/\bHour\b/);
    expect(screen.getByRole('checkbox', { name: 'Add the domain pack ($297)' })).not.toBeChecked();
    expect(container.textContent ?? '').not.toMatch(/waive/i);
  });

  it('keeps Stage B as a paid add-on with no public credit control', () => {
    const view = render(<QuoteCalculator />);
    fireEvent.click(screen.getByRole('radio', { name: OUTCOME_OPTIONS[0].label }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Add the domain pack ($297)' }));
    expect(screen.queryByRole('checkbox', { name: /waive/i })).not.toBeInTheDocument();
    expect(view.container.textContent ?? '').not.toMatch(/waive/i);
    expect(screen.getByText('$297')).toBeInTheDocument();
    expect(screen.queryByText('Domain pack credit')).not.toBeInTheDocument();
    expect(screen.queryByText('$0')).not.toBeInTheDocument();
  });
});
