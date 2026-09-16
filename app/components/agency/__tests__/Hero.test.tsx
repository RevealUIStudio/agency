import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HERO_HEADLINE, HERO_SHOP_LINE, HERO_SUBLINE, Hero } from '@/components/agency/Hero';
import { INTRO_CALL_URL } from '@/lib/site';

describe('Hero', () => {
  it('leads with startups, then the shop line, not a local booking shop', () => {
    render(<Hero />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: HERO_HEADLINE,
      }),
    ).toBeInTheDocument();
    expect(HERO_HEADLINE).toMatch(/startups/i);
    expect(HERO_HEADLINE).toMatch(/agentic runtime/i);
    expect(HERO_HEADLINE).toMatch(/own domain/i);
    expect(HERO_HEADLINE).not.toMatch(
      /technical founders|small agencies|Fortune 500|SOC ?2|Maryville|Jobber|QBO|chatbot|receipts/i,
    );
    expect(screen.getByText(HERO_SUBLINE)).toBeInTheDocument();
    expect(HERO_SUBLINE).toMatch(/technical founders and small agencies/i);
    expect(HERO_SUBLINE).toMatch(/already run agents/i);
    expect(HERO_SUBLINE).toMatch(/existing tools report in/i);
    expect(HERO_SUBLINE).toMatch(/keep the stack/i);
    expect(HERO_SUBLINE).toMatch(/powerful \+ safe/i);
    expect(HERO_SUBLINE).toMatch(/agents leave receipts/i);
    expect(HERO_SUBLINE).toMatch(/catalog matches checkout/i);
    expect(screen.getByText((content) => content.includes(HERO_SHOP_LINE))).toBeInTheDocument();
    const lead = screen.getByText(/You run it, or I ship it with you/);
    expect(lead).toHaveTextContent('Consultation $300');
    expect(lead).toHaveTextContent('Pilot $1,500');
    expect(lead).toHaveTextContent('Launch $7,500');
    expect(lead).toHaveTextContent('Sit-down is an option on the same calendar.');
    expect(lead).toHaveTextContent('You already live in Cursor');
    expect(lead).not.toHaveTextContent('They operate, or they pay to implement');
    expect(lead).not.toHaveTextContent('You do not need to understand the tech');
    expect(lead).not.toHaveTextContent('Maryville');
    expect(lead).not.toHaveTextContent('Fortune 500');
    expect(lead).not.toHaveTextContent('SOC2');
    expect(screen.queryByText(/Meet the Fleet/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bHour\b/)).not.toBeInTheDocument();
    expect(screen.getByText('RevealUI Studio')).toBeInTheDocument();
    expect(screen.queryByText(/RevealUI Studio · Product studio/)).not.toBeInTheDocument();
    expect(screen.queryByText(/RevealUI Studio · Maryville, Tennessee/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fleet Stamp/)).not.toBeInTheDocument();
    expect(screen.queryByText(/forward deployed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/live-or-holdback/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/four tests/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/first half back/i)).not.toBeInTheDocument();
    expect(screen.getByText(/keep the stack/i)).toBeInTheDocument();
    expect(screen.queryByText(/written plan/i)).not.toBeInTheDocument();
  });

  it('uses the Google Calendar intro as the primary CTA', () => {
    render(<Hero />);
    const intro = screen.getByRole('link', { name: 'Book a 30-minute intro' });
    expect(intro).toHaveAttribute('href', INTRO_CALL_URL);
  });

  it('keeps the known-for em dash in the subline only', () => {
    const { container } = render(<Hero />);
    expect(HERO_SUBLINE).toContain('\u2014');
    expect((container.textContent ?? '').replaceAll(HERO_SUBLINE, '')).not.toContain('\u2014');
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
