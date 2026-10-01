import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactForm } from '@/components/agency/ContactForm';
import { submitContact } from '@/lib/api';
import { CONSULTATION, LAUNCH, PILOT } from '@/lib/engagements';
import { CONTACT_EMAIL } from '@/lib/site';

vi.mock('@/lib/api', () => ({
  submitContact: vi.fn(),
}));

const mockSubmit = vi.mocked(submitContact);

const validMessage = 'We need help connecting billing to the rest of the system we already run.';

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

  it('renders required fields, the three offer topics, and submit control', () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Company/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Topic/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Message/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: `${CONSULTATION.name} (${CONSULTATION.price})` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', {
        name: `${PILOT.name} (${PILOT.price}, includes 1 Adapter)`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: `${LAUNCH.name} (${LAUNCH.price})` }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Fleet Stamp/ })).not.toBeInTheDocument();
  });

  it('blocks empty submit with field errors and does not call the API', async () => {
    render(<ContactForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Name must be at least 2 characters')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Message must be at least 20 characters')).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('validates email shape and short messages', async () => {
    render(<ContactForm />);
    fillRequiredFields({ email: 'not-an-email', message: 'too short' });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Message must be at least 20 characters')).toBeInTheDocument();
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

    expect(await screen.findByText('Request received')).toBeInTheDocument();
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
    expect(screen.queryByText('Request received')).not.toBeInTheDocument();
  });

  it('sends the honeypot to the endpoint and waits for its acceptance', async () => {
    mockSubmit.mockResolvedValueOnce(null);
    render(<ContactForm />);

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/Website \(leave blank\)/), {
      target: { value: 'https://spam.example' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Request received')).toBeInTheDocument();
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ website: 'https://spam.example' }),
    );
  });
  it.each([
    ['Name', 'x'.repeat(121)],
    ['Company', 'x'.repeat(121)],
    ['Message', 'x'.repeat(5001)],
  ])('blocks an oversized %s using the server contract', async (label, value) => {
    render(<ContactForm />);
    fillRequiredFields();
    fireEvent.change(screen.getByRole('textbox', { name: new RegExp(`^${label}`) }), {
      target: { value },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: new RegExp(`^${label}`) })).toHaveAttribute(
        'aria-invalid',
        'true',
      ),
    );
    expect(mockSubmit).not.toHaveBeenCalled();
  });
});
