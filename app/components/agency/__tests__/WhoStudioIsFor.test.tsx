import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  STUDIO_FOR_AGENCY,
  STUDIO_FOR_BEATS,
  STUDIO_FOR_TITLE,
  WhoStudioIsFor,
} from '@/components/agency/WhoStudioIsFor';

describe('WhoStudioIsFor', () => {
  it('names three concrete beats and keeps Jobber as an anti only', () => {
    const { container } = render(<WhoStudioIsFor />);
    expect(screen.getByRole('heading', { level: 2, name: STUDIO_FOR_TITLE })).toBeInTheDocument();
    expect(document.getElementById('who')).not.toBeNull();
    expect(screen.getByText(STUDIO_FOR_AGENCY)).toBeInTheDocument();
    expect(STUDIO_FOR_AGENCY).toBe(
      'Small agencies: stop disclosing work your agents can’t receipt. Proof Sprint and Launch leave PROOF on the client’s domain.',
    );
    for (const beat of STUDIO_FOR_BEATS) {
      expect(screen.getByText(beat)).toBeInTheDocument();
    }
    expect(STUDIO_FOR_BEATS).toHaveLength(3);
    expect(STUDIO_FOR_BEATS[0]).toMatch(/^For:/);
    expect(STUDIO_FOR_BEATS[0]).toMatch(/technical founders and small agencies/i);
    expect(STUDIO_FOR_BEATS[0]).toMatch(/business layer on their domain/i);
    expect(STUDIO_FOR_BEATS[1]).toMatch(/^Not for:/);
    expect(STUDIO_FOR_BEATS[1]).toMatch(/hosted chatbot/i);
    expect(STUDIO_FOR_BEATS[1]).toMatch(/Jobber swap/i);
    expect(STUDIO_FOR_BEATS[1]).toMatch(/compliance checkbox/i);
    expect(STUDIO_FOR_BEATS[2]).toMatch(/^The deal:/);
    expect(STUDIO_FOR_BEATS[2]).toMatch(/You bring the domain/);
    expect(STUDIO_FOR_BEATS[2]).toMatch(/pay Launch to implement/);
    const text = container.textContent ?? '';
    expect(text).not.toContain('\u2014');
    expect(text).not.toMatch(/SOC ?2 certified|SOC2 ready|\baudited\b|SOC 2 compliant/i);
    expect(text).not.toMatch(/Fortune 500/);
    expect(text).not.toMatch(/Maryville|QBO|QuickBooks|RevDev|RevForge|RevKit/i);
    expect(text).not.toMatch(/high-stakes|regulated|mission-driven/i);
  });
});
