import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServiceTeasers } from '@/components/agency/ServiceTeasers';
import { LAUNCH, CONSULTATION, PROOF_SPRINT } from '@/lib/engagements';
import { INTRO_CALL_URL } from '@/lib/site';

describe('ServiceTeasers', () => {
  it('renders only the three locked studio offers', () => {
    const { container } = render(<ServiceTeasers />);
    expect(screen.getByText(CONSULTATION.name)).toBeInTheDocument();
    expect(screen.getByText(PROOF_SPRINT.name)).toBeInTheDocument();
    expect(screen.getByText(LAUNCH.name)).toBeInTheDocument();
    expect(screen.getByText(CONSULTATION.price)).toBeInTheDocument();
    expect(screen.getByText(PROOF_SPRINT.price)).toBeInTheDocument();
    expect(screen.getByText(LAUNCH.price)).toBeInTheDocument();
    expect(screen.queryByText('Fleet Stamp')).not.toBeInTheDocument();
    expect(screen.queryByText('Custom Build')).not.toBeInTheDocument();
    expect(screen.queryByText('AI Integration')).not.toBeInTheDocument();
    expect(screen.queryByText(/written plan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bdemo\b/i)).not.toBeInTheDocument();
    expect(container.textContent ?? '').toContain(LAUNCH.payment);
    expect(container.textContent ?? '').toContain(PROOF_SPRINT.payment);
    expect(container.textContent ?? '').not.toMatch(/four tests/i);
    expect(container.textContent ?? '').not.toMatch(/first half back/i);
    expect(container.textContent ?? '').not.toMatch(/keep the stack/i);
  });

  it('anchors each offer and points CTAs at the intro calendar', () => {
    render(<ServiceTeasers />);
    expect(document.getElementById('consultation')).not.toBeNull();
    expect(document.getElementById('proof-sprint')).not.toBeNull();
    expect(document.getElementById('launch-package')).not.toBeNull();
    const ctas = screen.getAllByRole('link', { name: 'Book a 30-minute intro' });
    expect(ctas.length).toBe(3);
    for (const cta of ctas) {
      expect(cta).toHaveAttribute('href', INTRO_CALL_URL);
    }
  });
});
