import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProofGapForm } from '@/components/agency/ProofGapForm';
import {
  PROOF_GAP_CTA,
  PROOF_GAP_PDF_HREF,
  PROOF_GAP_REQUEST_MESSAGE,
  PROOF_GAP_REQUEST_TOPIC,
  PROOF_GAP_THANKS_TITLE,
} from '@/content/proof-gap';
import { submitContact } from '@/lib/api';
import { CONTACT_EMAIL, INTRO_CALL_URL } from '@/lib/site';

vi.mock('@/lib/api', () => ({
  submitContact: vi.fn(),
}));

const mockSubmit = vi.mocked(submitContact);

function fillRequired(overrides?: { name?: string; email?: string }): void {
  fireEvent.change(screen.getByLabelText(/Name/), {
    target: { value: overrides?.name ?? 'Jane Founder' },
  });
  fireEvent.change(screen.getByLabelText(/Email/), {
    target: { value: overrides?.email ?? 'jane@example.com' },
  });
}

describe('ProofGapForm', () => {
  beforeEach(() => {
    mockSubmit.mockReset();
  });

  it('asks for name and email only, with the locked CTA', () => {
    render(<ProofGapForm />);
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Message/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Topic/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: PROOF_GAP_CTA })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Request a quote/i })).not.toBeInTheDocument();
  });

  it('blocks empty submit and does not call the API', async () => {
    render(<ProofGapForm />);
    fireEvent.click(screen.getByRole('button', { name: PROOF_GAP_CTA }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('validates email shape', async () => {
    render(<ProofGapForm />);
    fillRequired({ email: 'not-an-email' });
    fireEvent.click(screen.getByRole('button', { name: PROOF_GAP_CTA }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('submits through the existing contact API', async () => {
    mockSubmit.mockResolvedValueOnce(null);
    const onSuccess = vi.fn();
    render(<ProofGapForm onSuccess={onSuccess} />);

    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: PROOF_GAP_CTA }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });
    expect(mockSubmit).toHaveBeenCalledWith({
      name: 'Jane Founder',
      email: 'jane@example.com',
      topic: PROOF_GAP_REQUEST_TOPIC,
      message: PROOF_GAP_REQUEST_MESSAGE,
      website: '',
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(PROOF_GAP_THANKS_TITLE)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download the PDF' })).toHaveAttribute(
      'href',
      PROOF_GAP_PDF_HREF,
    );
    expect(screen.getByRole('link', { name: 'Book a 30-minute intro' })).toHaveAttribute(
      'href',
      INTRO_CALL_URL,
    );
    expect(screen.getByRole('link', { name: CONTACT_EMAIL })).toHaveAttribute(
      'href',
      `mailto:${CONTACT_EMAIL}`,
    );
  });

  it('surfaces API errors without delivering the checklist', async () => {
    mockSubmit.mockResolvedValueOnce('Inbox is temporarily unavailable.');
    const onSuccess = vi.fn();
    render(<ProofGapForm onSuccess={onSuccess} />);

    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: PROOF_GAP_CTA }));

    expect(await screen.findByText('Inbox is temporarily unavailable.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: PROOF_GAP_CTA })).toBeInTheDocument();
    expect(screen.queryByText(PROOF_GAP_THANKS_TITLE)).not.toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('honeypot success skips the network and still delivers', async () => {
    const onSuccess = vi.fn();
    render(<ProofGapForm onSuccess={onSuccess} />);

    fillRequired();
    fireEvent.change(screen.getByLabelText(/Website \(leave blank\)/), {
      target: { value: 'https://spam.example' },
    });
    fireEvent.click(screen.getByRole('button', { name: PROOF_GAP_CTA }));

    expect(await screen.findByText(PROOF_GAP_THANKS_TITLE)).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
