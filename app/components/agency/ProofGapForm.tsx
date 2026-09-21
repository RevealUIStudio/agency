import { ButtonCVA as Button, Callout, FormField, Input, LinkButton } from '@revealui/presentation';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { z } from 'zod';
import {
  PROOF_GAP_CTA,
  PROOF_GAP_DOWNLOAD_LABEL,
  PROOF_GAP_PDF_HREF,
  PROOF_GAP_REQUEST_MESSAGE,
  PROOF_GAP_REQUEST_TOPIC,
  PROOF_GAP_THANKS_BODY,
  PROOF_GAP_THANKS_CONSULT,
  PROOF_GAP_THANKS_INTRO,
  PROOF_GAP_THANKS_LEAD,
  PROOF_GAP_THANKS_TITLE,
} from '@/content/proof-gap';
import { submitContact } from '@/lib/api';
import { CONTACT_EMAIL, INTRO_CALL_URL } from '@/lib/site';

interface FieldErrors {
  name?: string;
  email?: string;
}

function validateField(field: keyof FieldErrors, value: string): string | undefined {
  switch (field) {
    case 'name':
      if (!value.trim()) return 'Name is required';
      if (value.trim().length < 2) return 'Name must be at least 2 characters';
      return undefined;
    case 'email':
      if (!value.trim()) return 'Email is required';
      if (!z.email().safeParse(value).success) return 'Enter a valid email address';
      return undefined;
  }
}

export function ProofGapForm({ onSuccess }: { onSuccess?: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    website: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleBlur(field: keyof FieldErrors) {
    const error = validateField(field, formData[field]);
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  }

  function deliver() {
    setStatus('success');
    onSuccess?.();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === 'loading') return;

    const errors: FieldErrors = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    if (formData.website) {
      deliver();
      return;
    }

    setStatus('loading');
    const error = await submitContact({
      name: formData.name.trim(),
      email: formData.email.trim(),
      topic: PROOF_GAP_REQUEST_TOPIC,
      message: PROOF_GAP_REQUEST_MESSAGE,
      website: formData.website,
    });
    if (error === null) {
      deliver();
    } else {
      setStatus('error');
      setErrorMessage(error);
    }
  }

  if (status === 'success') {
    return (
      <div className="space-y-6">
        <Callout variant="success" title={PROOF_GAP_THANKS_TITLE}>
          <p className="text-sm">{PROOF_GAP_THANKS_LEAD}</p>
          <p className="mt-3 text-sm">{PROOF_GAP_THANKS_BODY}</p>
          <p className="mt-3 text-sm">{PROOF_GAP_THANKS_CONSULT}</p>
          <p className="mt-3 text-sm">{PROOF_GAP_THANKS_INTRO}</p>
        </Callout>
        <div className="flex flex-wrap items-center gap-4">
          <LinkButton href={PROOF_GAP_PDF_HREF} external download>
            {PROOF_GAP_DOWNLOAD_LABEL}
          </LinkButton>
          <LinkButton href={INTRO_CALL_URL} external appearance="outline" variant="neutral">
            Book a 30-minute intro
          </LinkButton>
        </div>
        <p className="text-xs text-muted-foreground">
          If the download fails, email{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-semibold text-foreground hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <FormField id="proof-gap-name" label="Name" error={fieldErrors.name} required>
          <Input
            id="proof-gap-name"
            type="text"
            required
            autoComplete="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            onBlur={() => handleBlur('name')}
            aria-invalid={fieldErrors.name ? true : undefined}
            invalid={!!fieldErrors.name}
            placeholder="Your name"
          />
        </FormField>
        <FormField id="proof-gap-email" label="Email" error={fieldErrors.email} required>
          <Input
            id="proof-gap-email"
            type="email"
            required
            autoComplete="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            onBlur={() => handleBlur('email')}
            aria-invalid={fieldErrors.email ? true : undefined}
            invalid={!!fieldErrors.email}
            placeholder="you@company.com"
          />
        </FormField>
      </div>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
        <label htmlFor="proof-gap-website">
          Website (leave blank)
          <Input
            id="proof-gap-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          />
        </label>
      </div>

      {status === 'error' && <Callout variant="error">{errorMessage}</Callout>}

      <Button
        type="submit"
        variant="brand"
        isLoading={status === 'loading'}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Sending…' : PROOF_GAP_CTA}
      </Button>
      <p className="text-xs text-muted-foreground">
        Name and email only. We use the same inbox as the contact form. By sending, you agree to our{' '}
        <a href="/privacy" className="font-semibold text-muted-foreground hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
