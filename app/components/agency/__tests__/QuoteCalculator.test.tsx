import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuoteCalculator } from '@/components/agency/QuoteCalculator';
import { CARE, CARE_PUBLIC_LABEL, CONSULTATION, LAUNCH, PILOT } from '@/lib/engagements';
import {
  HOSTER_OPTIONS,
  INTRO_HEADING,
  LAUNCH_QUOTE_DETAIL,
  OUTCOME_OPTIONS,
  QUOTE_OWNERSHIP,
  SELF_HOST_HANDOFF,
} from '@/lib/quote';
import { CONSULTATION_BOOK_PATH, INTRO_CALL_URL, PRODUCT_SITE_URL } from '@/lib/site';

describe('QuoteCalculator', () => {
  it('defaults to Pilot and hides unrelated purchase controls', () => {
    render(<QuoteCalculator />);
    expect(screen.getByRole('radio', { name: OUTCOME_OPTIONS[1].label })).toBeChecked();
    expect(screen.getByText(PILOT.price)).toBeInTheDocument();
    expect(screen.queryByText(CONSULTATION.price)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Consultation hours')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Book a Consultation' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Discuss Pilot on a free intro' })).toHaveAttribute(
      'href',
      INTRO_CALL_URL,
    );
  });

  it('keeps ownership lines and the Google Calendar intro on the quote card', () => {
    render(<QuoteCalculator />);
    for (const line of QUOTE_OWNERSHIP) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
    const intro = screen.getByRole('link', { name: 'Discuss Pilot on a free intro' });
    expect(intro).toHaveAttribute('href', INTRO_CALL_URL);
    expect(intro).toHaveAttribute('href', expect.stringContaining('calendar.google.com'));
    expect(screen.queryByRole('link', { name: 'Book a Consultation' })).not.toBeInTheDocument();
  });

  it('stops quoting when they pick more than one site', () => {
    render(<QuoteCalculator />);
    fireEvent.click(screen.getByRole('radio', { name: /More than one/ }));
    expect(screen.getByText(INTRO_HEADING)).toBeInTheDocument();
    expect(screen.queryByText(LAUNCH.price)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book a free 30-minute intro' })).toHaveAttribute(
      'href',
      INTRO_CALL_URL,
    );
    expect(screen.queryByRole('link', { name: 'Book a Consultation' })).not.toBeInTheDocument();
  });

  it('sends self-host visitors to the product site instead of quoting product SKUs', () => {
    const { container } = render(<QuoteCalculator />);
    fireEvent.click(screen.getByRole('radio', { name: HOSTER_OPTIONS[0].label }));
    expect(screen.getByText(SELF_HOST_HANDOFF)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Compare product licenses' })).toHaveAttribute(
      'href',
      PRODUCT_SITE_URL,
    );
    expect(screen.queryByText(LAUNCH.price)).not.toBeInTheDocument();
    expect(screen.queryByText(LAUNCH_QUOTE_DETAIL)).not.toBeInTheDocument();
    expect(container.textContent ?? '').not.toMatch(/\$49/);
    expect(container.textContent ?? '').not.toMatch(/\$99/);
    expect(container.textContent ?? '').not.toMatch(/\$299/);
    expect(container.textContent ?? '').not.toMatch(/Enterprise/);
    expect(screen.getByRole('link', { name: 'Book a free 30-minute intro' })).toHaveAttribute(
      'href',
      INTRO_CALL_URL,
    );
    expect(screen.queryByRole('link', { name: 'Book a Consultation' })).not.toBeInTheDocument();
  });

  it('multiplies Consultation by the hours dropdown and does not name a separate SKU', () => {
    const { container } = render(<QuoteCalculator />);
    fireEvent.click(screen.getByRole('radio', { name: OUTCOME_OPTIONS[0].label }));
    const hours = screen.getByLabelText('Consultation hours');
    expect(hours).toHaveValue('1');
    fireEvent.change(hours, { target: { value: '4' } });
    expect(screen.getByText('$1,200')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book a Consultation' })).toHaveAttribute(
      'href',
      `${CONSULTATION_BOOK_PATH}?hours=4&stage_b=false`,
    );
    expect(container.textContent ?? '').not.toMatch(/\bHour\b/);
    expect(screen.getByRole('checkbox', { name: 'Domain add-on: $297' })).not.toBeChecked();
    expect(screen.queryByRole('checkbox', { name: /On Care/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Extra Adapters')).not.toBeInTheDocument();
    expect(container.textContent ?? '').not.toMatch(/waive/i);
  });

  it('shows Adapter extras only for implementation offers', () => {
    render(<QuoteCalculator />);
    fireEvent.click(screen.getByRole('radio', { name: OUTCOME_OPTIONS[0].label }));
    expect(screen.queryByLabelText('Extra Adapters')).not.toBeInTheDocument();
    expect(screen.queryByText('$2,497')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: OUTCOME_OPTIONS[1].label }));
    fireEvent.change(screen.getByLabelText('Extra Adapters'), { target: { value: '1' } });
    expect(screen.getByText('$2,497')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: OUTCOME_OPTIONS[0].label }));
    expect(screen.queryByLabelText('Extra Adapters')).not.toBeInTheDocument();
    expect(screen.queryByText('$2,497')).not.toBeInTheDocument();
  });

  it('offers Care and prices an added Adapter without a Domain add-on charge', () => {
    render(<QuoteCalculator />);
    fireEvent.click(screen.getByRole('radio', { name: CARE_PUBLIC_LABEL }));
    expect(screen.getByRole('heading', { name: CARE.name })).toBeInTheDocument();
    expect(screen.getByLabelText('Adapters')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Adapters'), { target: { value: '1' } });
    expect(screen.getByText('$2,497')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Domain add-on: $297' })).not.toBeInTheDocument();
  });

  it('keeps Stage B as a paid add-on with no public credit control', () => {
    const view = render(<QuoteCalculator />);
    fireEvent.click(screen.getByRole('radio', { name: OUTCOME_OPTIONS[0].label }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Domain add-on: $297' }));
    expect(screen.queryByRole('checkbox', { name: /waive/i })).not.toBeInTheDocument();
    expect(view.container.textContent ?? '').not.toMatch(/waive/i);
    expect(screen.getByText('$297')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book a Consultation' })).toHaveAttribute(
      'href',
      `${CONSULTATION_BOOK_PATH}?hours=1&stage_b=true`,
    );
    expect(screen.queryByText('Domain add-on credit')).not.toBeInTheDocument();
    expect(screen.queryByText('$0')).not.toBeInTheDocument();
  });
});
