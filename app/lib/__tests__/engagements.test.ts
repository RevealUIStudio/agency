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
    expect(PUBLIC_OFFERS.map((offer) => offer.name)).toEqual(['Consultation', 'Pilot', 'Launch']);
    expect(WORKING_SESSION.name).toBe('Consultation');
    expect(WORKING_SESSION.price).toBe('$300');
    expect(WRITTEN_PLAN.name).toBe('Pilot');
    expect(WRITTEN_PLAN.price).toBe('$1,500');
    expect(LAUNCH_PACKAGE.name).toBe('Launch');
    expect(LAUNCH_PACKAGE.price).toBe('$7,500');
  });

  it('keeps Launch aligned with @revealui/contracts/pricing and Pilot studio-only', () => {
    expect(WRITTEN_PLAN.price).toBe('$1,500');
    expect(LAUNCH_PACKAGE.price).toBe('$7,500');
  });

  it('does not list internal product lanes on the public menu', () => {
    const names = PUBLIC_OFFERS.map((offer) => offer.name);
    expect(names).not.toContain(FLEET_STAMP.name);
    expect(names).not.toContain(CUSTOM_BUILD.name);
    expect(names).not.toContain('AI Integration');
    expect(names).not.toContain('Architecture Review');
    expect(names).not.toContain('Hour');
    expect(names).not.toContain('Written plan');
    expect(names).not.toContain('Architecture artifact bundle and review');
    expect(names).not.toContain('Working session');
    expect(names).not.toContain('Live page');
    expect(names).not.toContain('Launch package');
    expect(WRITTEN_PLAN.description).toMatch(/your domain/i);
    expect(WRITTEN_PLAN.description).toMatch(/you operate/i);
    expect(WRITTEN_PLAN.description).not.toMatch(/written plan/i);
    expect(WRITTEN_PLAN.description).not.toMatch(/\bdemo\b/i);
    expect(WRITTEN_PLAN.description).not.toMatch(/\bSpec\b/);
    expect(LAUNCH_PACKAGE.description).toMatch(/inside this offer/i);
  });

  it('keeps honest payment terms and does not sell live-or-holdback', () => {
    expect(LAUNCH_PACKAGE.payment).toBe('Half now, half on delivery.');
    expect(LAUNCH_PACKAGE.payment).not.toMatch(/four tests/i);
    expect(LAUNCH_PACKAGE.payment).not.toMatch(/signup-to-paid/i);
    expect(LAUNCH_PACKAGE.payment).not.toMatch(/first half back/i);
    expect(LAUNCH_PACKAGE.payment).not.toMatch(/keep the stack/i);
    expect(LAUNCH_PACKAGE.payment).not.toMatch(/make-good/i);
    expect(WORKING_SESSION.payment).toContain('No holdback');
    expect(WORKING_SESSION.payment).toContain('Invoice $300 before we start');
    expect(WORKING_SESSION.payment).not.toContain('first half back');
    expect(WRITTEN_PLAN.payment).toContain('Credits 100% to Launch');
    expect(WRITTEN_PLAN.payment).toContain('30 days');
    expect(WRITTEN_PLAN.payment).toContain('You keep the site if you walk');
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
