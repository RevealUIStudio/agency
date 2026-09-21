import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PROOF_GAP_BULLETS,
  PROOF_GAP_CTA,
  PROOF_GAP_H1,
  PROOF_GAP_KNOWN_FOR,
  PROOF_GAP_LADDER,
  PROOF_GAP_OFFER_NAME,
  PROOF_GAP_PDF_HREF,
  PROOF_GAP_PROOF_LINE,
  PROOF_GAP_SUB,
  PROOF_GAP_THANKS_TITLE,
} from '@/content/proof-gap';
import { submitContact } from '@/lib/api';
import { INTRO_CALL_URL } from '@/lib/site';
import { ProofGapPage } from '@/routes/ProofGapPage';

vi.mock('@/lib/api', () => ({
  submitContact: vi.fn(),
}));

const mockSubmit = vi.mocked(submitContact);

function fillGate(overrides?: { name?: string; email?: string }): void {
  fireEvent.change(screen.getByLabelText(/Name/), {
    target: { value: overrides?.name ?? 'Jane Founder' },
  });
  fireEvent.change(screen.getByLabelText(/Email/), {
    target: { value: overrides?.email ?? 'jane@example.com' },
  });
}

describe('ProofGapPage', () => {
  beforeEach(() => {
    mockSubmit.mockReset();
  });

  it('locks the gate H1, sub, bullets, and soft CTA', () => {
    const { container } = render(<ProofGapPage />);
    const text = container.textContent ?? '';

    expect(screen.getByRole('heading', { level: 1, name: PROOF_GAP_H1 })).toBeInTheDocument();
    expect(text).toContain(PROOF_GAP_SUB);
    expect(text).toContain(PROOF_GAP_PROOF_LINE);
    expect(text).toContain(PROOF_GAP_KNOWN_FOR);
    expect(text).toContain(PROOF_GAP_LADDER);
    for (const bullet of PROOF_GAP_BULLETS) {
      expect(text).toContain(bullet);
    }
    expect(screen.getByRole('button', { name: PROOF_GAP_CTA })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Request a quote/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Request a quote/i })).not.toBeInTheDocument();
    expect(text).not.toMatch(/faster than Zap/i);
    expect(text).not.toMatch(/revolutionize|empower|seamless/i);
    expect(text).not.toMatch(/RevMind/);
    expect(text).not.toMatch(/Architecture-as-Consultation/);
    expect(text).not.toMatch(/instant ROI/i);
    expect(text).not.toMatch(/limited (spots|time)|act now|sale ends/i);
    expect(screen.queryByRole('heading', { name: PROOF_GAP_OFFER_NAME })).not.toBeInTheDocument();
  });

  it('delivers the checklist after a valid submit', async () => {
    mockSubmit.mockResolvedValueOnce(null);
    render(<ProofGapPage />);

    fillGate();
    fireEvent.click(screen.getByRole('button', { name: PROOF_GAP_CTA }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText(PROOF_GAP_THANKS_TITLE)).toBeInTheDocument();
    const pdf = screen.getByRole('link', { name: 'Download the PDF' });
    expect(pdf).toHaveAttribute('href', PROOF_GAP_PDF_HREF);
    expect(screen.getByRole('link', { name: 'Book a 30-minute intro' })).toHaveAttribute(
      'href',
      INTRO_CALL_URL,
    );
    expect(screen.getByText(/you don't need a Google account/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: PROOF_GAP_OFFER_NAME })).toBeInTheDocument();
    expect(screen.getByText('1) Ownership & domain')).toBeInTheDocument();
    expect(screen.getByText('3) Receipted actions (PROOF)')).toBeInTheDocument();
  });
});
