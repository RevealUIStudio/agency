import { describe, expect, it } from 'vitest';
import { FLEET_NAME, LEAD_PRODUCT, REVVAULT_ROLE } from '@/lib/fleet';

describe('RevealFleet facts', () => {
  it('locks the public family name and the buyable catalog', () => {
    expect(FLEET_NAME).toBe('RevealFleet');
    expect(LEAD_PRODUCT).toBe('RevealUI');
    expect(REVVAULT_ROLE).toMatch(/inside Pro/);
    expect(REVVAULT_ROLE).toMatch(/not a separate paid SKU/);
  });

  it('does not sell parked or internal fleet members', () => {
    const blob = `${FLEET_NAME} ${LEAD_PRODUCT} ${REVVAULT_ROLE}`;
    expect(blob).not.toMatch(/RevForge|RevKit|RevDev|Agency Perpetual/);
    expect(blob).not.toMatch(/\$25,?000|8,?499/);
  });
});
