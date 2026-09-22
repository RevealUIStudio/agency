import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RevealFleet } from '@/components/agency/RevealFleet';
import { LAUNCH_PACKAGE, WORKING_SESSION, WRITTEN_PLAN } from '@/lib/engagements';
import { FLEET_NAME } from '@/lib/fleet';
import { PRODUCT_SITE_URL } from '@/lib/site';

describe('RevealFleet', () => {
  it('names the family, leads with RevealUI, and links to the product site', () => {
    render(<RevealFleet />);
    expect(screen.getByRole('heading', { level: 2, name: FLEET_NAME })).toBeInTheDocument();
    expect(screen.getByText(/RevealUI is the agentic business runtime/)).toBeInTheDocument();
    expect(
      screen.getByText(/Knowledge Graph is part of that runtime \(Electric\+CRDT\)/),
    ).toBeInTheDocument();
    expect(screen.getByText(/not a Studio SKU/)).toBeInTheDocument();
    const product = screen.getByRole('link', { name: 'RevealUI on revealui.com' });
    expect(product).toHaveAttribute('href', PRODUCT_SITE_URL);
  });

  it('keeps studio offers on this page and does not dump the product catalog', () => {
    const { container } = render(<RevealFleet />);
    const text = container.textContent ?? '';
    expect(text).toContain(WORKING_SESSION.name);
    expect(text).toContain(WORKING_SESSION.price);
    expect(text).toContain(WRITTEN_PLAN.name);
    expect(text).toContain(WRITTEN_PLAN.price);
    expect(text).toContain(LAUNCH_PACKAGE.price);
    expect(text).toMatch(/You run it, or I ship it with you/);
    expect(text).toMatch(/startups/i);
    expect(text).toMatch(/technical founders and small agencies/i);
    expect(text).not.toMatch(/\$49/);
    expect(text).not.toMatch(/\$99/);
    expect(text).not.toMatch(/Pro Perpetual/);
    expect(text).not.toMatch(/Enterprise by inquiry/);
    expect(text).not.toMatch(/RevVault/);
  });

  it('does not sell parked SKUs or use the RevealFleet nickname', () => {
    const { container } = render(<RevealFleet />);
    const text = container.textContent ?? '';
    expect(text).not.toContain('\u2014');
    expect(text).not.toMatch(/RevealFleet|revealfleet/);
    expect(text).not.toMatch(/written plan/i);
    expect(text).not.toMatch(/\bSpec\b/);
    expect(text).not.toMatch(/RevForge|RevKit|RevDev|Agency Perpetual/);
    expect(text).not.toMatch(/\$25,?000|8,?499/);
    expect(text).not.toMatch(/live-or-holdback|0\.2\.12/);
    expect(text).not.toMatch(/Architecture Review/);
    expect(text).not.toMatch(/Knowledge Graph \$/);
  });
});
