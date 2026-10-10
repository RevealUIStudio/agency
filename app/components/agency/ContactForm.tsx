import { ContactInquirySchema } from '@revealui/contracts/public-inquiry';
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
import { submitContact } from '@/lib/api';
import { CARE, CARE_PUBLIC_LABEL, CONSULTATION, LAUNCH, PILOT } from '@/lib/engagements';
import { CONTACT_EMAIL } from '@/lib/site';

const topics = [
  { value: CONSULTATION.id, label: `${CONSULTATION.name} (${CONSULTATION.price})` },
  { value: PILOT.id, label: `${PILOT.name} (${PILOT.price}, includes 1 Adapter)` },
  { value: LAUNCH.id, label: `${LAUNCH.name} (${LAUNCH.price})` },
  { value: CARE.id, label: CARE_PUBLIC_LABEL },
  { value: 'general', label: "I'm not sure which engagement fits" },
] as const;

/** Allowed topic values — defends the payload if formData.topic is ever off-list. */
const validTopics = new Set<string>(topics.map((t) => t.value));

interface FieldErrors {
  name?: string;
  email?: string;
  message?: string;
  company?: string;
}

function validateField(field: keyof FieldErrors, value: string): string | undefined {
  const result = ContactInquirySchema.shape[field].safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
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
      company: validateField('company', formData.company),
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

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
      <Callout variant="success" title="Request received">
        <p className="text-sm">
          We aim to respond within 1–2 business days. If you haven&apos;t heard back, email{' '}
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
            maxLength={ContactInquirySchema.shape.name.maxLength ?? undefined}
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
            maxLength={ContactInquirySchema.shape.email.maxLength ?? undefined}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            onBlur={() => handleBlur('email')}
            aria-invalid={fieldErrors.email ? true : undefined}
            invalid={!!fieldErrors.email}
            placeholder="you@company.com"
          />
        </FormField>
      </div>
      <FormField
        id="contact-company"
        label="Company"
        description="Optional"
        error={fieldErrors.company}
      >
        <Input
          id="contact-company"
          type="text"
          autoComplete="organization"
          maxLength={ContactInquirySchema.shape.company.unwrap().maxLength ?? undefined}
          onBlur={() => handleBlur('company')}
          aria-invalid={fieldErrors.company ? true : undefined}
          invalid={!!fieldErrors.company}
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
      <FormField
        id="contact-message"
        label="Message"
        description="Please leave out passwords, API keys, and sensitive customer data."
        error={fieldErrors.message}
        required
      >
        <Textarea
          id="contact-message"
          required
          rows={6}
          maxLength={ContactInquirySchema.shape.message.maxLength ?? undefined}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          onBlur={() => handleBlur('message')}
          aria-invalid={fieldErrors.message ? true : undefined}
          invalid={!!fieldErrors.message}
          placeholder="What do you want your workflow to do, and what is getting in the way?"
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
          <Input
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
        We aim to respond within 1–2 business days. We use these details to respond to your inquiry.
        Read our{' '}
        <a href="/privacy" className="font-semibold text-muted-foreground hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
