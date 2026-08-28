import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServiceTeasers } from '@/components/agency/ServiceTeasers';
import { LAUNCH_PACKAGE, WORKING_SESSION, WRITTEN_PLAN } from '@/lib/engagements';
import { INTRO_CALL_URL } from '@/lib/site';

describe('ServiceTeasers', () => {
  it('renders only the three locked studio offers', () => {
    const { container } = render(<ServiceTeasers />);
    expect(screen.getByText(WORKING_SESSION.name)).toBeInTheDocument();
    expect(screen.getByText(WRITTEN_PLAN.name)).toBeInTheDocument();
    expect(screen.getByText(LAUNCH_PACKAGE.name)).toBeInTheDocument();
    expect(screen.getByText(WORKING_SESSION.price)).toBeInTheDocument();
    expect(screen.getByText(WRITTEN_PLAN.price)).toBeInTheDocument();
    expect(screen.getByText(LAUNCH_PACKAGE.price)).toBeInTheDocument();
    expect(screen.queryByText('Fleet Stamp')).not.toBeInTheDocument();
    expect(screen.queryByText('Custom Build')).not.toBeInTheDocument();
    expect(screen.queryByText('AI Integration')).not.toBeInTheDocument();
    expect(screen.queryByText(/written plan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bdemo\b/i)).not.toBeInTheDocument();
    expect(container.textContent ?? '').toContain(LAUNCH_PACKAGE.payment);
    expect(container.textContent ?? '').toContain(WRITTEN_PLAN.payment);
    expect(container.textContent ?? '').not.toMatch(/four tests/i);
    expect(container.textContent ?? '').not.toMatch(/first half back/i);
    expect(container.textContent ?? '').not.toMatch(/keep the stack/i);
  });

  it('anchors each offer and points CTAs at the intro calendar', () => {
    render(<ServiceTeasers />);
    expect(document.getElementById('working-session')).not.toBeNull();
    expect(document.getElementById('written-plan')).not.toBeNull();
    expect(document.getElementById('launch-package')).not.toBeNull();
    const ctas = screen.getAllByRole('link', { name: 'Book a 30-minute intro' });
    expect(ctas.length).toBe(3);
    for (const cta of ctas) {
      expect(cta).toHaveAttribute('href', INTRO_CALL_URL);
    }
  });
});
