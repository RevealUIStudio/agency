import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hero } from '@/components/agency/Hero';
import { INTRO_CALL_URL } from '@/lib/site';

describe('Hero', () => {
  it('leads with the local studio offer, not a runtime pitch', () => {
    render(<Hero />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /A local studio for a site, a booking flow, or a written plan\./,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Maryville, Tennessee/)).toBeInTheDocument();
    expect(screen.queryByText(/Fleet Stamp/)).not.toBeInTheDocument();
    expect(screen.queryByText(/forward deployed/i)).not.toBeInTheDocument();
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
});
