import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TrustRoadmap } from '@/components/agency/TrustRoadmap';
import { TRUST_FAQ, TRUST_SHORT, TRUST_TITLE } from '@/content/trust';
import { findBannedToolNames } from '@/lib/buyer-facing-names';

describe('TrustRoadmap', () => {
  it('leads with ownership, inspectability and a defined scope', () => {
    const { container } = render(<TrustRoadmap />);
    expect(screen.getByRole('heading', { level: 2, name: TRUST_TITLE })).toBeInTheDocument();
    for (const para of TRUST_SHORT) expect(screen.getByText(para)).toBeVisible();
    expect(TRUST_SHORT.join(' ')).not.toMatch(/SOC ?2|ISO 27001|certif|audited/i);
    const text = container.textContent ?? '';
    expect(findBannedToolNames(text)).toEqual([]);
    expect(text).not.toMatch(/We are SOC ?2 certified|SOC2 ready|In audit|Fortune 500/i);
  });

  it('keeps current status and an unscheduled journey inside closed, readable FAQs', () => {
    render(<TrustRoadmap />);
    const faq = document.getElementById('trust-faq');
    expect(faq).not.toBeNull();
    for (const item of TRUST_FAQ) {
      const summary = within(faq as HTMLElement).getByText(item.q);
      expect(summary.tagName).toBe('SUMMARY');
      const details = summary.closest('details');
      expect(details).not.toHaveAttribute('open');
      expect(within(details as HTMLElement).getByText(item.a)).toBeInTheDocument();
    }
    expect(faq?.textContent).toContain('does not currently have an independent SOC 2 report');
    expect(faq?.textContent).toContain('Those reports cover the vendor, not RevealUI Studio.');
    expect(faq?.textContent).toContain('An independent assessment is not scheduled.');
    expect(faq?.textContent).toContain('the roadmap is not an attestation');
  });
});
