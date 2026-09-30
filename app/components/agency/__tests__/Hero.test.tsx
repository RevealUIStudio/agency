import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  HERO_HEADLINE,
  HERO_MENU,
  HERO_RESULT,
  HERO_SHOP_LINE,
  Hero,
} from '@/components/agency/Hero';
import { INTRO_CALL_URL } from '@/lib/site';

describe('Studio hero', () => {
  it('explains implementation and displays the public offer menu', () => {
    const { container } = render(<Hero />);
    expect(screen.getByRole('heading', { level: 1, name: HERO_HEADLINE })).toBeInTheDocument();
    expect(screen.getByText(HERO_SHOP_LINE)).toBeInTheDocument();
    expect(screen.getByText(HERO_RESULT)).toBeInTheDocument();
    expect(screen.queryByText(HERO_MENU)).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent(/Proof Sprint|Powerful \+ safe|PROOF|\u2014/);
  });

  it('links the free intro and quote to their supported destinations', () => {
    render(<Hero />);
    expect(screen.getByRole('link', { name: 'Book a free 30-minute intro' })).toHaveAttribute(
      'href',
      INTRO_CALL_URL,
    );
    expect(screen.getByRole('link', { name: 'Find your starting point' })).toHaveAttribute(
      'href',
      '/#calculator',
    );
  });

  it('labels the sample receipt and shows paid Consultation before delivered notes', () => {
    render(<Hero />);
    const receipt = screen.getByRole('region', { name: 'An example engagement record' });
    expect(receipt).toHaveTextContent('paid');
    expect(receipt).toHaveTextContent('session notes');
    expect(
      screen.getByText('Illustration only. These are example events, not a customer engagement.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'How we work →' })).toHaveAttribute('href', '/process');
  });
});
