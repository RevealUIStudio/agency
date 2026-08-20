import { describe, expect, it } from 'vitest';
import {
  CUSTOM_BUILD,
  FLEET_STAMP,
  LAUNCH_PACKAGE,
  PUBLIC_OFFERS,
  WORKING_SESSION,
  WRITTEN_PLAN,
} from '@/lib/engagements';

describe('public studio offers', () => {
  it('exposes only the three locked stranger-facing SKUs', () => {
    expect(PUBLIC_OFFERS.map((offer) => offer.id)).toEqual([
      'working-session',
      'written-plan',
      'launch-package',
    ]);
    expect(WORKING_SESSION.price).toBe('$300');
    expect(WRITTEN_PLAN.price).toBe('$3,500');
    expect(LAUNCH_PACKAGE.price).toBe('$7,500');
  });

  it('keeps written-plan and launch prices aligned with @revealui/contracts/pricing', () => {
    expect(WRITTEN_PLAN.price).toBe('$3,500');
    expect(LAUNCH_PACKAGE.price).toBe('$7,500');
  });

  it('does not list internal product lanes on the public menu', () => {
    const names = PUBLIC_OFFERS.map((offer) => offer.name);
    expect(names).not.toContain(FLEET_STAMP.name);
    expect(names).not.toContain(CUSTOM_BUILD.name);
    expect(names).not.toContain('AI Integration');
  });
});
