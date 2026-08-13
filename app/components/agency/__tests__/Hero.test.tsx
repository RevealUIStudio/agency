import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hero } from '@/components/agency/Hero';
import { ARCHITECTURE_REVIEW, RUNTIME_METRICS } from '@/lib/engagements';

describe('Hero', () => {
  it('leads with the FDE experimental H1 and scenario-first subhead', () => {
    render(<Hero />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /We build and deploy the runtime\.\s*You keep it\./,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/working agent demo and a production-lift problem/),
    ).toBeInTheDocument();
    expect(screen.getByText(/forward deployed engineers/)).toBeInTheDocument();
  });

  it('keeps discovery as primary CTA and GitHub as secondary', () => {
    render(<Hero />);
    const discovery = screen.getByRole('link', { name: 'Book a discovery call' });
    expect(discovery).toHaveAttribute('href', '/contact');
    const github = screen.getByRole('link', { name: 'Read the runtime on GitHub' });
    expect(github).toHaveAttribute('href', 'https://github.com/RevealUIStudio/revealui');
  });

  it('quotes MARKETING_METRICS-backed package counts', () => {
    render(<Hero />);
    expect(
      screen.getByText(`${RUNTIME_METRICS.packages} packages in the runtime monorepo`),
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${RUNTIME_METRICS.mit} MIT, forever`))).toBeInTheDocument();
    // Price appears in the Architecture Review proof + CTA link text.
    expect(screen.getAllByText(ARCHITECTURE_REVIEW.price, { exact: false }).length).toBeGreaterThan(
      0,
    );
  });

  it('contains no em dash in the hero lead copy', () => {
    const { container } = render(<Hero />);
    expect(container.textContent ?? '').not.toContain('\u2014');
  });

  it('echoes the receipt motif with agency stamp content and product-proof link', () => {
    render(<Hero />);
    expect(screen.getByRole('region', { name: 'Fleet stamp, handed over' })).toBeInTheDocument();
    expect(screen.getAllByText('deploy-agent').length).toBeGreaterThan(0);
    expect(screen.getByText(/customer runtime on their VPC/)).toBeInTheDocument();
    expect(screen.getByText(/If an agent did it, there's a receipt\./)).toBeInTheDocument();
    const proof = screen.getByRole('link', { name: 'See the product proof →' });
    expect(proof).toHaveAttribute('href', 'https://revealui.com/claims');
  });
});
