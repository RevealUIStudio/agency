import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  HERO_HEADLINE,
  HERO_MENU,
  HERO_PROOF,
  HERO_RESULT,
  HERO_SHOP_LINE,
  HERO_SUBLINE,
  Hero,
} from '@/components/agency/Hero';
import { INTRO_CALL_URL } from '@/lib/site';

describe('Hero', () => {
  it('keeps the known-for H1, then pain → result → menu → PROOF', () => {
    render(<Hero />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: HERO_HEADLINE,
      }),
    ).toBeInTheDocument();
    expect(HERO_HEADLINE).toBe(
      'The agentic business runtime startups operate on their own domain.',
    );
    expect(HERO_HEADLINE).toMatch(/startups/i);
    expect(HERO_HEADLINE).toMatch(/agentic business runtime/i);
    expect(HERO_HEADLINE).toMatch(/own domain/i);
    expect(HERO_HEADLINE).not.toMatch(
      /technical founders|small agencies|Fortune 500|SOC ?2|Maryville|Jobber|QBO|chatbot|receipts|Tired of/i,
    );
    expect(screen.queryByText(HERO_SUBLINE)).not.toBeInTheDocument();
    expect(HERO_SUBLINE).toMatch(/technical founders and small agencies/i);
    expect(HERO_SUBLINE).toMatch(/already run agents/i);
    expect(HERO_SUBLINE).toMatch(/existing tools report in/i);
    expect(HERO_SUBLINE).toMatch(/keep the stack/i);
    expect(HERO_SUBLINE).toMatch(/powerful \+ safe/i);
    expect(HERO_SUBLINE).toMatch(/agents leave receipts/i);
    expect(HERO_SUBLINE).toMatch(/catalog matches checkout/i);
    expect(screen.getByText(HERO_SHOP_LINE)).toBeInTheDocument();
    expect(HERO_SHOP_LINE).toBe(
      'Tired of Zap owning the critical path, agents that act without PROOF, and client updates with nothing receipted?',
    );
    expect(screen.getByText(HERO_RESULT)).toBeInTheDocument();
    expect(HERO_RESULT).toMatch(/You already live in Cursor/);
    expect(HERO_RESULT).toMatch(/booking, invoices, and agents with PROOF on your domain/);
    expect(HERO_RESULT).toMatch(/You run it, or I ship it with you/);
    expect(screen.getByText(HERO_MENU)).toBeInTheDocument();
    expect(HERO_MENU).toBe('Consultation $300 · Pilot $1,500 · Launch $7,500.');
    expect(screen.getByText(HERO_PROOF)).toBeInTheDocument();
    expect(HERO_PROOF).toBe("If an agent did it, there's PROOF — a receipted action you can show.");
    const headline = screen.getByRole('heading', { level: 1, name: HERO_HEADLINE });
    const section = headline.closest('section');
    expect(section).not.toBeNull();
    const text = section?.textContent ?? '';
    expect(text.indexOf(HERO_HEADLINE)).toBeLessThan(text.indexOf(HERO_SHOP_LINE));
    expect(text.indexOf(HERO_SHOP_LINE)).toBeLessThan(text.indexOf(HERO_RESULT));
    expect(text.indexOf(HERO_RESULT)).toBeLessThan(text.indexOf(HERO_MENU));
    expect(text.indexOf(HERO_MENU)).toBeLessThan(text.indexOf(HERO_PROOF));
    expect(text.indexOf(HERO_PROOF)).toBeLessThan(text.indexOf('Book a 30-minute intro'));
    expect(text).not.toContain('They operate, or they pay to implement');
    expect(text).not.toContain('You do not need to understand the tech');
    expect(text).not.toContain('Maryville');
    expect(text).not.toContain('Fortune 500');
    expect(text).not.toContain('SOC2');
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
    expect(screen.queryByText(/written plan/i)).not.toBeInTheDocument();
  });

  it('uses the Google Calendar intro as the primary CTA', () => {
    render(<Hero />);
    const intro = screen.getByRole('link', { name: 'Book a 30-minute intro' });
    expect(intro).toHaveAttribute('href', INTRO_CALL_URL);
    expect(screen.getByRole('link', { name: 'Get a quote' })).toHaveAttribute(
      'href',
      '/#calculator',
    );
  });

  it('keeps the known-for em dash out of the H1 and in PROOF only on the hero', () => {
    const { container } = render(<Hero />);
    expect(HERO_SUBLINE).toContain('\u2014');
    expect(HERO_PROOF).toContain('\u2014');
    expect(HERO_HEADLINE).not.toContain('\u2014');
    expect(HERO_SHOP_LINE).not.toContain('\u2014');
    expect(HERO_RESULT).not.toContain('\u2014');
    expect(HERO_MENU).not.toContain('\u2014');
    expect((container.textContent ?? '').replaceAll(HERO_PROOF, '')).not.toContain('\u2014');
  });

  it('shows one honest process receipt under the CTAs', () => {
    render(<Hero />);
    const receipt = screen.getByRole('region', { name: 'How we work, on record' });
    expect(receipt).toHaveTextContent('$300');
    expect(receipt).toHaveTextContent('30-minute intro');
    expect(receipt).toHaveTextContent('Consultation $300');
    expect(screen.getByText(HERO_PROOF)).toBeInTheDocument();
    const process = screen.getByRole('link', { name: 'How we work →' });
    expect(process).toHaveAttribute('href', '/process');
    expect(screen.queryByText(/Fleet stamp/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/deploy-agent/)).not.toBeInTheDocument();
  });
});
