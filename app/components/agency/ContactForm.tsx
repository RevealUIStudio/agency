import {
  ButtonCVA as Button,
  Callout,
  FormField,
  Input,
  Select,
  Textarea,
} from '@revealui/presentation';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { z } from 'zod';
import { submitContact } from '@/lib/api';
import { ARCHITECTURE_REVIEW, LAUNCH_PACKAGE } from '@/lib/engagements';
import { CONTACT_EMAIL } from '@/lib/site';

const topics = [
  { value: 'fleet-trial-kit', label: 'Fleet Stamp engagement' },
  { value: 'custom-build', label: 'Custom platform build' },
  { value: 'ai-integration', label: 'AI Integration sprint' },
  {
    value: 'architecture-review',
    label: `Architecture Review (${ARCHITECTURE_REVIEW.price})`,
  },
  {
    value: 'launch-package',
    label: `Launch Package (${LAUNCH_PACKAGE.price})`,
  },
  { value: 'migration', label: 'Migration to RevealUI runtime' },
  { value: 'general', label: 'General inquiry' },
] as const;

/** Allowed topic values — defends the payload if formData.topic is ever off-list. */
const validTopics = new Set<string>(topics.map((t) => t.value));

interface FieldErrors {
  name?: string;
  email?: string;
  message?: string;
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
    case 'message':
      if (!value.trim()) return 'Message is required';
      if (value.trim().length < 20) return 'Tell us a bit more: at least 20 characters';
      return undefined;
  }
}

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    topic: 'general',
    message: '',
    website: '', // honeypot — kept in state for trivial bot resistance
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleBlur(field: keyof FieldErrors) {
    const error = validateField(field, formData[field]);
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === 'loading') return;

    const errors: FieldErrors = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
      message: validateField('message', formData.message),
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    // Honeypot: a filled 'website' field means a bot. Show a fake success and
    // skip the network call entirely so the bot gets no signal either way.
    if (formData.website) {
      setStatus('success');
      return;
    }

    setStatus('loading');
    const error = await submitContact({
      name: formData.name.trim(),
      email: formData.email.trim(),
      company: formData.company.trim() || undefined,
      topic: validTopics.has(formData.topic) ? formData.topic : 'general',
      message: formData.message.trim(),
      website: formData.website,
    });
    if (error === null) {
      setStatus('success');
    } else {
      setStatus('error');
      setErrorMessage(error);
    }
  }

  if (status === 'success') {
    return (
      <Callout variant="success" title="Message sent">
        <p className="text-sm">
          We&apos;ll respond within 1-2 business days. If it&apos;s urgent, email{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-semibold text-foreground hover:underline"
          >
            {CONTACT_EMAIL}
          </a>{' '}
          directly.
        </p>
      </Callout>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <FormField id="contact-name" label="Name" error={fieldErrors.name} required>
          <Input
            id="contact-name"
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
        <FormField id="contact-email" label="Email" error={fieldErrors.email} required>
          <Input
            id="contact-email"
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
      <FormField id="contact-company" label="Company" description="Optional">
        <Input
          id="contact-company"
          type="text"
          autoComplete="organization"
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          placeholder="Company or project name"
        />
      </FormField>
      <FormField id="contact-topic" label="Topic">
        <Select
          id="contact-topic"
          value={formData.topic}
          onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
        >
          {topics.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField id="contact-message" label="Message" error={fieldErrors.message} required>
        <Textarea
          id="contact-message"
          required
          rows={6}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          onBlur={() => handleBlur('message')}
          aria-invalid={fieldErrors.message ? true : undefined}
          invalid={!!fieldErrors.message}
          placeholder="What are you trying to build, and what stage are you at?"
        />
      </FormField>

      {/*
        Honeypot — visually hidden via inline styles so bots that ignore CSS
        but parse the DOM still see it. Real users never see this field.
      */}
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
        <label htmlFor="contact-website">
          Website (leave blank)
          <input
            id="contact-website"
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
        {status === 'loading' ? 'Sending…' : 'Send message'}
      </Button>
      <p className="text-xs text-muted-foreground">
        We respond within 1-2 business days. By sending, you agree to our{' '}
        <a href="/privacy" className="font-semibold text-muted-foreground hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
