import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServiceTeasers } from '@/components/agency/ServiceTeasers';
import { ARCHITECTURE_REVIEW, LAUNCH_PACKAGE } from '@/lib/engagements';

describe('ServiceTeasers', () => {
  it('renders the three productized engagement lanes', () => {
    render(<ServiceTeasers />);
    expect(screen.getByText('Fleet Stamp')).toBeInTheDocument();
    expect(screen.getByText('Custom Build')).toBeInTheDocument();
    expect(screen.getByText('AI Integration')).toBeInTheDocument();
  });

  it('surfaces Architecture Review intake with price, anchor, and CTA', () => {
    render(<ServiceTeasers />);
    expect(
      screen.getByText(`${ARCHITECTURE_REVIEW.name}: ${ARCHITECTURE_REVIEW.price} fixed-bid SOW`),
    ).toBeInTheDocument();
    expect(screen.getByText(/credited toward a Fleet deployment/)).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: 'Book the Architecture Review' });
    expect(cta).toHaveAttribute('href', '/contact');
    expect(document.getElementById('architecture-review')).not.toBeNull();
  });

  it('surfaces Launch Package intake with price, anchor, and CTA', () => {
    render(<ServiceTeasers />);
    expect(
      screen.getByText(`${LAUNCH_PACKAGE.name}: ${LAUNCH_PACKAGE.price} fixed-bid SOW`),
    ).toBeInTheDocument();
    expect(screen.getByText(/two to four weeks/)).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: 'Book the Launch Package' });
    expect(cta).toHaveAttribute('href', '/contact');
    expect(document.getElementById('launch-package')).not.toBeNull();
  });
});
