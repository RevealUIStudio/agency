import { describe, expect, it } from 'vitest';
import { LEAD_PRODUCT, PRODUCT_CATALOG, REVVAULT_ROLE } from '@/lib/fleet';

describe('live product facts', () => {
  it('locks the buyable catalog', () => {
    expect(LEAD_PRODUCT).toBe('RevealUI');
    expect(PRODUCT_CATALOG.free).toBe('Free $0');
    expect(PRODUCT_CATALOG.pro).toBe('$49');
    expect(PRODUCT_CATALOG.max).toBe('$299');
    expect(PRODUCT_CATALOG.enterprise).toBe('Inquire');
    expect(PRODUCT_CATALOG.proPerpetual).toBe('$1,499');
    expect(REVVAULT_ROLE).toMatch(/inside Pro/);
    expect(REVVAULT_ROLE).toMatch(/not a separate paid SKU/);
  });

  it('does not sell a product family or parked members', () => {
    const blob = `${LEAD_PRODUCT} ${Object.values(PRODUCT_CATALOG).join(' ')} ${REVVAULT_ROLE}`;
    expect(blob).not.toMatch(/RevealFleet|RevFleet|revfleet/);
    expect(blob).not.toMatch(/RevForge|RevKit|RevDev|Agency Perpetual/);
    expect(blob).not.toMatch(/Railway|starter-kit|\/templates/i);
    expect(blob).not.toMatch(/\$25,?000|8,?499/);
  });
});
