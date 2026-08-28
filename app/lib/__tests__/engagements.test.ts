import { describe, expect, it } from 'vitest';
import {
  CUSTOM_BUILD,
  FLEET_STAMP,
  LAUNCH_PACKAGE,
  PUBLIC_OFFERS,
  RUNTIME_METRICS,
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
    expect(names).not.toContain('Architecture Review');
    expect(WRITTEN_PLAN.name).toBe('Architecture artifact bundle and review');
    expect(WRITTEN_PLAN.description).toMatch(/artifact bundle/i);
    expect(WRITTEN_PLAN.description).toMatch(/prototype/i);
    expect(WRITTEN_PLAN.description).not.toMatch(/written plan/i);
    expect(WRITTEN_PLAN.description).not.toMatch(/\bdemo\b/i);
    expect(WRITTEN_PLAN.description).not.toMatch(/\bSpec\b/);
  });

  it('keeps Launch at half now / half on delivery without live-or-holdback', () => {
    expect(LAUNCH_PACKAGE.payment).toBe('Half now, half on delivery.');
    expect(LAUNCH_PACKAGE.payment).not.toContain('four tests');
    expect(LAUNCH_PACKAGE.payment).not.toContain('first half back');
    expect(LAUNCH_PACKAGE.payment).not.toContain('keep the stack');
    expect(WORKING_SESSION.payment).toContain('No holdback');
    expect(WORKING_SESSION.payment).not.toContain('first half back');
    expect(WRITTEN_PLAN.payment).toContain('Credits to a launch in 30 days');
    expect(WRITTEN_PLAN.payment).toContain('Half now, half on delivery');
    expect(WRITTEN_PLAN.payment).not.toContain('first half back');
    expect(WRITTEN_PLAN.payment).not.toContain('holdback');
  });

  it('pins monorepo metrics to MARKETING_METRICS §1 (2026-08-19)', () => {
    expect(RUNTIME_METRICS.packages).toBe(32);
    expect(RUNTIME_METRICS.mit).toBe(25);
    expect(RUNTIME_METRICS.fsl).toBe(5);
    expect(RUNTIME_METRICS.mit + RUNTIME_METRICS.fsl).toBeLessThanOrEqual(RUNTIME_METRICS.packages);
  });
});
