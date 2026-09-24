import { describe, expect, it } from 'vitest';
import {
  CONSULTATION,
  CUSTOM_BUILD,
  FLEET_STAMP,
  LAUNCH,
  PROOF_SPRINT,
  PUBLIC_OFFERS,
  RUNTIME_METRICS,
} from '@/lib/engagements';

describe('public studio offers', () => {
  it('exposes only the three locked stranger-facing SKUs', () => {
    expect(PUBLIC_OFFERS.map((offer) => offer.id)).toEqual([
      'consultation',
      'proof-sprint',
      'launch-package',
    ]);
    expect(PUBLIC_OFFERS.map((offer) => offer.name)).toEqual([
      'Consultation',
      'Proof Sprint',
      'Launch',
    ]);
    expect(CONSULTATION.name).toBe('Consultation');
    expect(CONSULTATION.price).toBe('$300');
    expect(PROOF_SPRINT.name).toBe('Proof Sprint');
    expect(PROOF_SPRINT.price).toBe('$3,997');
    expect(LAUNCH.name).toBe('Launch');
    expect(LAUNCH.price).toBe('$14,500');
  });

  it('keeps Launch at the locked list price until contracts publish the same number', () => {
    expect(PROOF_SPRINT.price).toBe('$3,997');
    expect(LAUNCH.price).toBe('$14,500');
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
    expect(names).not.toContain('Guardrail');
    expect(names).not.toContain('Guardrail agent');
    expect(names).not.toContain('Guardrail agent (template)');
    expect(names).not.toContain('Knowledge Graph');
    expect(PROOF_SPRINT.tagline).toBe('One site. One receipted action you operate.');
    expect(PROOF_SPRINT.description).toMatch(/one receipted action you operate/i);
    expect(PROOF_SPRINT.description).toMatch(/Stage B is included/i);
    expect(PROOF_SPRINT.description).toMatch(/45 days/i);
    expect(PROOF_SPRINT.description).not.toMatch(/written plan/i);
    expect(PROOF_SPRINT.description).not.toMatch(/\bdemo\b/i);
    expect(PROOF_SPRINT.description).not.toMatch(/\bSpec\b/);
    expect(LAUNCH.description).toMatch(/inside this offer/i);
    expect(LAUNCH.description).toMatch(/Knowledge Graph is part of the runtime/);
    expect(LAUNCH.description).toMatch(/Electric\+CRDT/);
    expect(LAUNCH.description).toMatch(/not a fourth Studio offer/);
    expect(LAUNCH.description).not.toMatch(/\$\d/);
  });

  it('keeps honest payment terms and does not sell live-or-holdback', () => {
    expect(LAUNCH.payment).toBe('Half now, half on delivery.');
    expect(LAUNCH.payment).not.toMatch(/four tests/i);
    expect(LAUNCH.payment).not.toMatch(/signup-to-paid/i);
    expect(LAUNCH.payment).not.toMatch(/first half back/i);
    expect(LAUNCH.payment).not.toMatch(/keep the stack/i);
    expect(LAUNCH.payment).not.toMatch(/make-good/i);
    expect(CONSULTATION.payment).toContain('No holdback');
    expect(CONSULTATION.payment).toContain('Pay $300 per hour when you book the slot');
    expect(CONSULTATION.payment).not.toContain('first half back');
    expect(PROOF_SPRINT.payment).toContain('Credits 100% to Launch');
    expect(PROOF_SPRINT.payment).toContain('45 days');
    expect(PROOF_SPRINT.payment).toContain('You keep the site if you walk');
    expect(PROOF_SPRINT.payment).not.toContain('first half back');
    expect(PROOF_SPRINT.payment).not.toContain('holdback');
  });

  it('pins monorepo metrics to MARKETING_METRICS §1 (2026-08-19)', () => {
    expect(RUNTIME_METRICS.packages).toBe(32);
    expect(RUNTIME_METRICS.mit).toBe(25);
    expect(RUNTIME_METRICS.fsl).toBe(5);
    expect(RUNTIME_METRICS.mit + RUNTIME_METRICS.fsl).toBeLessThanOrEqual(RUNTIME_METRICS.packages);
  });
});
