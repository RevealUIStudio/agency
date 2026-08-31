import { describe, expect, it } from 'vitest';
import {
  ARCHITECTURE_ARTIFACT_BUNDLE,
  CUSTOM_BUILD,
  FLEET_STAMP,
  LAUNCH_PACKAGE,
  PUBLIC_OFFERS,
  RUNTIME_METRICS,
  WORKING_SESSION,
} from '@/lib/engagements';

describe('public studio offers', () => {
  it('exposes only the three locked stranger-facing SKUs', () => {
    expect(PUBLIC_OFFERS.map((offer) => offer.id)).toEqual([
      'working-session',
      'architecture-artifact-bundle',
      'launch-package',
    ]);
    expect(WORKING_SESSION.name).toBe('Hour');
    expect(WORKING_SESSION.price).toBe('$300');
    expect(ARCHITECTURE_ARTIFACT_BUNDLE.price).toBe('$3,500');
    expect(LAUNCH_PACKAGE.price).toBe('$7,500');
  });

  it('keeps architecture-artifact-bundle and launch prices aligned with @revealui/contracts/pricing', () => {
    expect(ARCHITECTURE_ARTIFACT_BUNDLE.price).toBe('$3,500');
    expect(LAUNCH_PACKAGE.price).toBe('$7,500');
  });

  it('does not list internal product lanes on the public menu', () => {
    const names = PUBLIC_OFFERS.map((offer) => offer.name);
    expect(names).not.toContain(FLEET_STAMP.name);
    expect(names).not.toContain(CUSTOM_BUILD.name);
    expect(names).not.toContain('AI Integration');
    expect(names).not.toContain('Architecture Review');
    expect(ARCHITECTURE_ARTIFACT_BUNDLE.name).toBe('Architecture artifact bundle and review');
    expect(ARCHITECTURE_ARTIFACT_BUNDLE.id).toBe('architecture-artifact-bundle');
    expect(ARCHITECTURE_ARTIFACT_BUNDLE.description).toMatch(/artifact bundle/i);
    expect(ARCHITECTURE_ARTIFACT_BUNDLE.description).toMatch(/prototype/i);
    expect(ARCHITECTURE_ARTIFACT_BUNDLE.description).not.toMatch(/written plan/i);
    expect(ARCHITECTURE_ARTIFACT_BUNDLE.description).not.toMatch(/\bdemo\b/i);
    expect(ARCHITECTURE_ARTIFACT_BUNDLE.description).not.toMatch(/\bSpec\b/);
  });

  it('keeps honest payment terms and does not sell live-or-holdback', () => {
    expect(LAUNCH_PACKAGE.payment).toBe('Half now, half on delivery.');
    expect(LAUNCH_PACKAGE.payment).not.toMatch(/four tests/i);
    expect(LAUNCH_PACKAGE.payment).not.toMatch(/signup-to-paid/i);
    expect(LAUNCH_PACKAGE.payment).not.toMatch(/first half back/i);
    expect(LAUNCH_PACKAGE.payment).not.toMatch(/keep the stack/i);
    expect(LAUNCH_PACKAGE.payment).not.toMatch(/make-good/i);
    expect(WORKING_SESSION.payment).toContain('No holdback');
    expect(WORKING_SESSION.payment).not.toContain('first half back');
    expect(ARCHITECTURE_ARTIFACT_BUNDLE.payment).toContain('Credits to a launch in 30 days');
    expect(ARCHITECTURE_ARTIFACT_BUNDLE.payment).not.toContain('first half back');
    expect(ARCHITECTURE_ARTIFACT_BUNDLE.payment).not.toContain('holdback');
  });

  it('pins monorepo metrics to MARKETING_METRICS §1 (2026-08-19)', () => {
    expect(RUNTIME_METRICS.packages).toBe(32);
    expect(RUNTIME_METRICS.mit).toBe(25);
    expect(RUNTIME_METRICS.fsl).toBe(5);
    expect(RUNTIME_METRICS.mit + RUNTIME_METRICS.fsl).toBeLessThanOrEqual(RUNTIME_METRICS.packages);
  });
});
