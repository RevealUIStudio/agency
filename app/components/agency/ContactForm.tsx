import type { FormEvent } from 'react';
import { useState } from 'react';
import { submitContact } from '../../lib/api';
import { CONTACT_EMAIL } from '../../lib/site';

const topics = [
  { value: 'fleet-trial-kit', label: 'Fleet Stamp engagement' },
  { value: 'custom-build', label: 'Custom platform build' },
  { value: 'ai-integration', label: 'AI Integration sprint' },
  { value: 'architecture-review', label: 'Architecture Review ($3,500)' },
  { value: 'migration', label: 'Migration to RevealUI runtime' },
  { value: 'general', label: 'General inquiry' },
] as const;

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
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
      return undefined;
    case 'message':
      if (!value.trim()) return 'Message is required';
      if (value.trim().length < 20) return 'Tell us a bit more — at least 20 characters';
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

    setStatus('loading');
    const error = await submitContact({
      name: formData.name.trim(),
      email: formData.email.trim(),
      company: formData.company.trim() || undefined,
      topic: formData.topic,
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
      <div className="rounded-2xl border border-success/30 bg-success/10 p-8 text-center">
        <svg
          aria-hidden="true"
          className="mx-auto h-12 w-12 text-success"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <title>Sent</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-semibold text-foreground">Message sent</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ll respond within 1-2 business days. If it&apos;s urgent, email{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-semibold text-foreground hover:underline"
          >
            {CONTACT_EMAIL}
          </a>{' '}
          directly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="block text-sm font-medium text-foreground">
            Name
          </label>
          <input
            id="contact-name"
            type="text"
            required
            autoComplete="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            onBlur={() => handleBlur('name')}
            aria-invalid={fieldErrors.name ? true : undefined}
            aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
            className={`mt-2 block w-full rounded-lg border-0 px-4 py-2.5 text-foreground shadow-sm ring-1 placeholder:text-muted-foreground focus:ring-2 sm:text-sm ${
              fieldErrors.name
                ? 'ring-destructive/50 focus:ring-destructive'
                : 'ring-input focus:ring-ring'
            }`}
            placeholder="Your name"
          />
          {fieldErrors.name && (
            <p id="contact-name-error" className="mt-1 text-xs text-destructive">
              {fieldErrors.name}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="contact-email"
            type="email"
            required
            autoComplete="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            onBlur={() => handleBlur('email')}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined}
            className={`mt-2 block w-full rounded-lg border-0 px-4 py-2.5 text-foreground shadow-sm ring-1 placeholder:text-muted-foreground focus:ring-2 sm:text-sm ${
              fieldErrors.email
                ? 'ring-destructive/50 focus:ring-destructive'
                : 'ring-input focus:ring-ring'
            }`}
            placeholder="you@company.com"
          />
          {fieldErrors.email && (
            <p id="contact-email-error" className="mt-1 text-xs text-destructive">
              {fieldErrors.email}
            </p>
          )}
        </div>
      </div>
      <div>
        <label htmlFor="contact-company" className="block text-sm font-medium text-foreground">
          Company <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          id="contact-company"
          type="text"
          autoComplete="organization"
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          className="mt-2 block w-full rounded-lg border-0 px-4 py-2.5 text-foreground shadow-sm ring-1 ring-input placeholder:text-muted-foreground focus:ring-2 focus:ring-ring sm:text-sm"
          placeholder="Company or project name"
        />
      </div>
      <div>
        <label htmlFor="contact-topic" className="block text-sm font-medium text-foreground">
          Topic
        </label>
        <select
          id="contact-topic"
          value={formData.topic}
          onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
          className="mt-2 block w-full rounded-lg border-0 px-4 py-2.5 text-foreground shadow-sm ring-1 ring-input focus:ring-2 focus:ring-ring sm:text-sm"
        >
          {topics.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium text-foreground">
          Message
        </label>
        <textarea
          id="contact-message"
          required
          rows={6}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          onBlur={() => handleBlur('message')}
          aria-invalid={fieldErrors.message ? true : undefined}
          aria-describedby={fieldErrors.message ? 'contact-message-error' : undefined}
          className={`mt-2 block w-full rounded-lg border-0 px-4 py-2.5 text-foreground shadow-sm ring-1 placeholder:text-muted-foreground focus:ring-2 sm:text-sm ${
            fieldErrors.message
              ? 'ring-destructive/50 focus:ring-destructive'
              : 'ring-input focus:ring-ring'
          }`}
          placeholder="What are you trying to build, and what stage are you at?"
        />
        {fieldErrors.message && (
          <p id="contact-message-error" className="mt-1 text-xs text-destructive">
            {fieldErrors.message}
          </p>
        )}
      </div>

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

      {status === 'error' && (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Sending…' : 'Send message'}
      </button>
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
