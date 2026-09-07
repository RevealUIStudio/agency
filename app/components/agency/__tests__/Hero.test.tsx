import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HERO_SHOP_LINE, Hero } from '@/components/agency/Hero';
import { INTRO_CALL_URL } from '@/lib/site';

describe('Hero', () => {
  it('leads with the product studio, not a local booking shop', () => {
    render(<Hero />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: HERO_SHOP_LINE,
      }),
    ).toBeInTheDocument();
    const lead = screen.getByText(/They operate, or they pay to implement/);
    expect(lead).toHaveTextContent('Consultation $300');
    expect(lead).toHaveTextContent('Pilot $1,500');
    expect(lead).toHaveTextContent('Launch $7,500');
    expect(screen.queryByText(/Meet the Fleet/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bHour\b/)).not.toBeInTheDocument();
    expect(screen.getByText(/RevealUI Studio · Product studio/)).toBeInTheDocument();
    expect(screen.queryByText(/RevealUI Studio · Maryville, Tennessee/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fleet Stamp/)).not.toBeInTheDocument();
    expect(screen.queryByText(/forward deployed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/live-or-holdback/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/four tests/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/first half back/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/keep the stack/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/written plan/i)).not.toBeInTheDocument();
  });

  it('uses the Google Calendar intro as the primary CTA', () => {
    render(<Hero />);
    const intro = screen.getByRole('link', { name: 'Book a 30-minute intro' });
    expect(intro).toHaveAttribute('href', INTRO_CALL_URL);
  });

  it('contains no em dash in the hero lead copy', () => {
    const { container } = render(<Hero />);
    expect(container.textContent ?? '').not.toContain('\u2014');
  });

  it('shows one honest process receipt under the CTAs', () => {
    render(<Hero />);
    const receipt = screen.getByRole('region', { name: 'How we work, on record' });
    expect(receipt).toHaveTextContent('$300');
    expect(receipt).toHaveTextContent('30-minute intro');
    expect(receipt).toHaveTextContent('Consultation $300');
    expect(screen.getByText(/If an agent did it, there's a receipt\./)).toBeInTheDocument();
    const process = screen.getByRole('link', { name: 'How we work →' });
    expect(process).toHaveAttribute('href', '/process');
    expect(screen.queryByText(/Fleet stamp/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/deploy-agent/)).not.toBeInTheDocument();
  });
});
