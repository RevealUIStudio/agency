import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactForm } from '@/components/agency/ContactForm';
import { submitContact } from '@/lib/api';
import { ARCHITECTURE_REVIEW, LAUNCH_PACKAGE } from '@/lib/engagements';
import { CONTACT_EMAIL } from '@/lib/site';

vi.mock('@/lib/api', () => ({
  submitContact: vi.fn(),
}));

const mockSubmit = vi.mocked(submitContact);

const validMessage = 'We have a working agent demo and need a production-lift plan for our stack.';

function fillRequiredFields(overrides?: { name?: string; email?: string; message?: string }): void {
  fireEvent.change(screen.getByLabelText(/Name/), {
    target: { value: overrides?.name ?? 'Jane Founder' },
  });
  fireEvent.change(screen.getByLabelText(/Email/), {
    target: { value: overrides?.email ?? 'jane@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/Message/), {
    target: { value: overrides?.message ?? validMessage },
  });
}

describe('ContactForm', () => {
  beforeEach(() => {
    mockSubmit.mockReset();
  });

  it('renders required fields, topic options, and submit control', () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Company/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Topic/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Message/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', {
        name: `Architecture Review (${ARCHITECTURE_REVIEW.price})`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', {
        name: `Launch Package (${LAUNCH_PACKAGE.price})`,
      }),
    ).toBeInTheDocument();
  });

  it('blocks empty submit with field errors and does not call the API', async () => {
    render(<ContactForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Message is required')).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('validates email shape and short messages', async () => {
    render(<ContactForm />);
    fillRequiredFields({ email: 'not-an-email', message: 'too short' });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Tell us a bit more: at least 20 characters')).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('rejects a one-character name on submit', async () => {
    render(<ContactForm />);
    fillRequiredFields({ name: 'J' });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Name must be at least 2 characters')).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('submits a valid payload with source handled by the API client', async () => {
    mockSubmit.mockResolvedValueOnce(null);
    render(<ContactForm />);

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/Company/), {
      target: { value: 'Acme Ops' },
    });
    fireEvent.change(screen.getByLabelText(/Topic/), {
      target: { value: 'launch-package' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });
    expect(mockSubmit).toHaveBeenCalledWith({
      name: 'Jane Founder',
      email: 'jane@example.com',
      company: 'Acme Ops',
      topic: 'launch-package',
      message: validMessage,
      website: '',
    });

    expect(await screen.findByText('Message sent')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: CONTACT_EMAIL })).toHaveAttribute(
      'href',
      `mailto:${CONTACT_EMAIL}`,
    );
  });

  it('surfaces API errors without leaving the form', async () => {
    mockSubmit.mockResolvedValueOnce('Inbox is temporarily unavailable.');
    render(<ContactForm />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Inbox is temporarily unavailable.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
    expect(screen.queryByText('Message sent')).not.toBeInTheDocument();
  });

  it('honeypot success skips the network and shows Message sent', async () => {
    render(<ContactForm />);

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/Website \(leave blank\)/), {
      target: { value: 'https://spam.example' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Message sent')).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });
});
