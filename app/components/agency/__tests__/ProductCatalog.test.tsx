import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductCatalog } from '@/components/agency/ProductCatalog';
import { ARCHITECTURE_ARTIFACT_BUNDLE, LAUNCH_PACKAGE, WORKING_SESSION } from '@/lib/engagements';
import { LEAD_PRODUCT, PRODUCT_CATALOG } from '@/lib/fleet';
import { PRODUCT_SITE_URL } from '@/lib/site';

describe('ProductCatalog', () => {
  it('leads with RevealUI and links to the product site', () => {
    render(<ProductCatalog />);
    expect(screen.getByRole('heading', { level: 2, name: LEAD_PRODUCT })).toBeInTheDocument();
    expect(screen.getByText(/agent runtime with receipts/)).toBeInTheDocument();
    const buy = screen.getByRole('link', { name: 'Buy RevealUI' });
    expect(buy).toHaveAttribute('href', PRODUCT_SITE_URL);
  });

  it('prints the buyable catalog and names RevVault only as part of Pro', () => {
    const { container } = render(<ProductCatalog />);
    const text = container.textContent ?? '';
    expect(text).toContain(PRODUCT_CATALOG.free);
    expect(text).toContain(PRODUCT_CATALOG.pro);
    expect(text).toContain(PRODUCT_CATALOG.max);
    expect(text).toMatch(/Enterprise by inquiry/);
    expect(text).toContain('Pro Perpetual');
    expect(text).toContain(PRODUCT_CATALOG.proPerpetual);
    expect(text).toMatch(/RevVault is encrypted secret management inside Pro/);
    expect(text).toContain(WORKING_SESSION.name);
    expect(text).toContain(WORKING_SESSION.price);
    expect(text).toContain(ARCHITECTURE_ARTIFACT_BUNDLE.name);
    expect(text).toContain(ARCHITECTURE_ARTIFACT_BUNDLE.price);
    expect(text).toContain(LAUNCH_PACKAGE.price);
    expect(text).toMatch(/prototype inside the bundle/);
  });

  it('does not sell a product family or parked SKUs', () => {
    const { container } = render(<ProductCatalog />);
    const text = container.textContent ?? '';
    expect(text).not.toContain('\u2014');
    expect(text).not.toMatch(/RevealFleet|RevFleet|revfleet/);
    expect(text).not.toMatch(/ships RevealFleet/);
    expect(text).not.toMatch(/Product family/);
    expect(text).not.toMatch(/written plan/i);
    expect(text).not.toMatch(/\bSpec\b/);
    expect(text).not.toMatch(/RevForge|RevKit|RevDev|Agency Perpetual/);
    expect(text).not.toMatch(/Railway|starter-kit|\/templates/i);
    expect(text).not.toMatch(/\$25,?000|8,?499/);
    expect(text).not.toMatch(/live-or-holdback|0\.2\.12/);
  });
});
