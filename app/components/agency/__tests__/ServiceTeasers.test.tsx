import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServiceTeasers } from '@/components/agency/ServiceTeasers';

describe('ServiceTeasers', () => {
  it('renders the three engagement lanes', () => {
    render(<ServiceTeasers />);
    expect(screen.getByText('Fleet Stamp')).toBeInTheDocument();
    expect(screen.getByText('Custom Build')).toBeInTheDocument();
    expect(screen.getByText('AI Integration')).toBeInTheDocument();
  });

  it('surfaces the Architecture Review intake with price, anchor, and CTA', () => {
    render(<ServiceTeasers />);
    expect(screen.getByText('Architecture Review: $3,500 fixed-bid SOW')).toBeInTheDocument();
    expect(screen.getByText(/credited toward a Fleet deployment/)).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: 'Book the Architecture Review' });
    expect(cta).toHaveAttribute('href', '/contact');
    expect(document.getElementById('architecture-review')).not.toBeNull();
  });
});
