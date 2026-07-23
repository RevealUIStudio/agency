import { describe, expect, it } from 'vitest';
import {
  ARCHITECTURE_REVIEW,
  CUSTOM_BUILD,
  engagementPriceDisplay,
  FLEET_STAMP,
  LAUNCH_PACKAGE,
  RUNTIME_METRICS,
} from '@/lib/engagements';

describe('engagements SSOT', () => {
  it('imports Track D prices from @revealui/contracts/pricing', () => {
    expect(ARCHITECTURE_REVIEW.price).toBe('$3,500');
    expect(LAUNCH_PACKAGE.price).toBe('$7,500');
  });

  it('keeps agency-only fleet and custom anchors', () => {
    expect(FLEET_STAMP.price).toBe('$25,000');
    expect(FLEET_STAMP.startsFrom).toBe(true);
    expect(CUSTOM_BUILD.price).toBe('$50,000');
    expect(engagementPriceDisplay(FLEET_STAMP)).toBe('From $25,000. Scoped in discovery.');
  });

  it('pins monorepo metrics to MARKETING_METRICS shape', () => {
    expect(RUNTIME_METRICS.packages).toBe(29);
    expect(RUNTIME_METRICS.mit).toBe(23);
    expect(RUNTIME_METRICS.fsl).toBe(5);
    expect(RUNTIME_METRICS.mit + RUNTIME_METRICS.fsl).toBeLessThanOrEqual(RUNTIME_METRICS.packages);
  });
});
