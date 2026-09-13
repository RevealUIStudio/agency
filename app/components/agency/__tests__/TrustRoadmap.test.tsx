import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TrustRoadmap } from '@/components/agency/TrustRoadmap';
import { TRUST_FAQ, TRUST_ROADMAP, TRUST_SHORT, TRUST_TITLE } from '@/content/trust';

describe('TrustRoadmap', () => {
  it('prints the Auditor paste and does not claim a Studio certification', () => {
    const { container } = render(<TrustRoadmap />);
    const text = container.textContent ?? '';
    expect(screen.getByRole('heading', { level: 2, name: TRUST_TITLE })).toBeInTheDocument();
    expect(document.getElementById('trust')).not.toBeNull();
    for (const para of TRUST_SHORT) {
      expect(text).toContain(para);
    }
    expect(text).toContain('RevealUI Studio is not SOC 2 or ISO 27001 certified today.');
    expect(text).toContain('We are building toward SOC 2\u2013capable controls');
    expect(text).toContain('Neon (database)');
    expect(text).toContain('Vercel (hosting)');
    expect(text).toContain('Fly.io (long-running services)');
    expect(text).toContain('Stripe (payments)');
    expect(text).toContain('Sentry (error telemetry)');
    expect(text).toContain('their attestation is not our certification');
    expect(TRUST_ROADMAP.map((bucket) => bucket.label)).toEqual([
      'Now',
      'Next',
      'When cash',
      'Not claimed until a Studio report exists',
    ]);
    for (const bucket of TRUST_ROADMAP) {
      expect(screen.getByRole('heading', { level: 3, name: bucket.label })).toBeInTheDocument();
      for (const item of bucket.items) {
        expect(text).toContain(item);
      }
    }
    for (const item of TRUST_FAQ) {
      expect(screen.getByRole('heading', { level: 3, name: item.q })).toBeInTheDocument();
      expect(text).toContain(item.a);
    }
    expect(text).not.toMatch(/We are SOC ?2 certified/i);
    expect(text).not.toMatch(/In audit/i);
    expect(text).not.toMatch(/Our stack is SOC ?2 because Neon/i);
    expect(text).not.toMatch(/SOC2 ready/i);
    expect(text).not.toContain('\u2014');
    expect(text).not.toMatch(/Fortune 500/);
    expect(text).not.toMatch(/RevDev|RevForge|RevKit/);
  });
});
