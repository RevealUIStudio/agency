import { describe, expect, it } from 'vitest';
import { FLEET_NAME, LEAD_PRODUCT, PRODUCT_CATALOG, REVVAULT_ROLE } from '@/lib/fleet';

describe('RevealFleet facts', () => {
  it('locks the public family name and the buyable catalog', () => {
    expect(FLEET_NAME).toBe('RevealFleet');
    expect(LEAD_PRODUCT).toBe('RevealUI');
    expect(PRODUCT_CATALOG.free).toBe('Free $0');
    expect(PRODUCT_CATALOG.pro).toBe('$49');
    expect(PRODUCT_CATALOG.max).toBe('$299');
    expect(PRODUCT_CATALOG.enterprise).toBe('Inquire');
    expect(PRODUCT_CATALOG.proPerpetual).toBe('$1,499');
    expect(REVVAULT_ROLE).toMatch(/inside Pro/);
    expect(REVVAULT_ROLE).toMatch(/not a separate paid SKU/);
  });

  it('does not sell Fleet, RevDev, or RevKit as SKUs', () => {
    const blob = `${FLEET_NAME} ${LEAD_PRODUCT} ${Object.values(PRODUCT_CATALOG).join(' ')} ${REVVAULT_ROLE}`;
    expect(blob).not.toMatch(/RevFleet|revfleet/);
    expect(blob).not.toMatch(/RevForge|RevKit|RevDev|Agency Perpetual/);
    expect(blob).not.toMatch(/Fleet Stamp/);
    expect(blob).not.toMatch(/\$25,?000|8,?499/);
  });
});
