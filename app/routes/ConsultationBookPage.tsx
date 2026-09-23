import { type FormEvent, useEffect, useState } from 'react';
import {
  CONSULTATION_HOUR_OPTIONS,
  consultationDueCents,
  consultationHourCount,
  consultationHourLabel,
  DEFAULT_CONSULTATION_HOURS,
} from '@/lib/consultation-hours';
import { formatUsdFromCents } from '@/lib/money';
import { CONSULTATION_BOOK_PATH } from '@/lib/site';
import { STAGE_B_CENTS } from '@/lib/stage-b-invoice';

interface Slot {
  readonly start: string;
  readonly end: string;
  readonly label: string;
}

type LoadStatus = 'loading' | 'ready' | 'empty' | 'unconfigured' | 'error';

function assignCheckout(url: string) {
  window.location.assign(url);
}

const pageClass = 'min-w-0 max-w-full bg-background py-8 sm:py-24';
const frameClass = 'mx-auto min-w-0 max-w-3xl px-4 sm:px-6';
const headingClass = 'break-words text-3xl font-bold tracking-tight text-foreground sm:text-5xl';
const fieldClass =
  'w-full min-w-0 max-w-full rounded-xl border border-border bg-card px-4 py-3 text-base font-medium text-foreground';
const payClass =
  'inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-base font-semibold text-primary-foreground';

export function ConsultationBookPage({
  onCheckout = assignCheckout,
}: {
  onCheckout?: (url: string) => void;
}) {
  const [hours, setHours] = useState<number>(DEFAULT_CONSULTATION_HOURS);
  const [slots, setSlots] = useState<readonly Slot[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [stageB, setStageB] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setSelected('');
    setStatus('loading');
    const params = new URLSearchParams({ hours: String(hours) });
    fetch(`/api/consultation/availability?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 503) {
          setSlots([]);
          setStatus('unconfigured');
          return;
        }
        if (!response.ok) {
          setSlots([]);
          setStatus('error');
          return;
        }
        const body: unknown = await response.json();
        const raw =
          body && typeof body === 'object' && 'slots' in body && Array.isArray(body.slots)
            ? body.slots
            : [];
        const next: Slot[] = [];
        for (const item of raw) {
          if (!item || typeof item !== 'object') continue;
          const start = 'start' in item && typeof item.start === 'string' ? item.start : '';
          const end = 'end' in item && typeof item.end === 'string' ? item.end : '';
          const label = 'label' in item && typeof item.label === 'string' ? item.label : '';
          if (start && end && label) next.push({ start, end, label });
        }
        setSlots(next);
        setStatus(next.length === 0 ? 'empty' : 'ready');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setStatus('error');
      });
    return () => controller.abort();
  }, [hours]);

  const due = consultationDueCents(consultationHourCount(hours)) + (stageB ? STAGE_B_CENTS : 0);
  const ready = selected !== '' && name.trim().length > 0 && email.trim().length > 0;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slot = slots.find((item) => item.start === selected);
    if (!slot || !ready) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await fetch('/api/consultation/book', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          start: slot.start,
          end: slot.end,
          hours,
          name: name.trim(),
          email: email.trim(),
          company: company.trim() || undefined,
          stage_b: stageB,
        }),
      });
      if (response.status === 409) {
        setSubmitError('That slot was just taken. Pick another.');
        return;
      }
      if (response.status === 503) {
        setSubmitError('Booking is not available on this server yet.');
        return;
      }
      if (!response.ok) {
        setSubmitError('Could not start checkout.');
        return;
      }
      const body: unknown = await response.json();
      const checkoutUrl =
        body &&
        typeof body === 'object' &&
        'checkout_url' in body &&
        typeof body.checkout_url === 'string'
          ? body.checkout_url
          : '';
      if (!checkoutUrl) {
        setSubmitError('Could not start checkout.');
        return;
      }
      onCheckout(checkoutUrl);
    } catch {
      setSubmitError('Could not start checkout.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={pageClass}>
      <div className={frameClass}>
        <h1 className={headingClass}>Book a Consultation</h1>
        <p className="mt-6 break-words text-lg text-muted-foreground">
          Weekday slots, 60 minutes, Eastern Time. Pay $300 per hour when you book the slot. The
          30-minute intro stays separate.
        </p>

        <form className="mt-10 space-y-8" onSubmit={onSubmit}>
          <div>
            <label
              htmlFor="consultation-book-hours"
              className="text-base font-semibold text-foreground"
            >
              Consultation length
            </label>
            <select
              id="consultation-book-hours"
              value={hours}
              onChange={(event) => setHours(Number(event.target.value))}
              className={`mt-4 ${fieldClass}`}
            >
              {CONSULTATION_HOUR_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {consultationHourLabel(count)}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="text-base font-semibold text-foreground">Open slots</legend>
            {status === 'loading' ? (
              <p className="mt-4 text-sm text-muted-foreground">Loading open slots.</p>
            ) : null}
            {status === 'unconfigured' ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Booking is not available on this server yet.
              </p>
            ) : null}
            {status === 'error' ? (
              <p className="mt-4 text-sm text-muted-foreground">Could not load open slots.</p>
            ) : null}
            {status === 'empty' ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No open 60-minute slots in this window.
              </p>
            ) : null}
            {status === 'ready' ? (
              <div className="mt-4 space-y-3">
                {slots.map((slot) => (
                  <label
                    key={slot.start}
                    className="flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <input
                      type="radio"
                      name="slot"
                      value={slot.start}
                      checked={selected === slot.start}
                      onChange={() => setSelected(slot.start)}
                      className="mt-1 size-5 shrink-0 accent-primary"
                    />
                    <span className="min-w-0 break-words text-base font-medium text-foreground">
                      {slot.label}
                    </span>
                  </label>
                ))}
              </div>
            ) : null}
          </fieldset>

          <div className="grid grid-cols-1 gap-4">
            <label className="text-sm font-semibold text-foreground" htmlFor="consultation-name">
              Name
              <input
                id="consultation-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
                className={`mt-2 ${fieldClass}`}
              />
            </label>
            <label className="text-sm font-semibold text-foreground" htmlFor="consultation-email">
              Email
              <input
                id="consultation-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className={`mt-2 ${fieldClass}`}
              />
            </label>
            <label className="text-sm font-semibold text-foreground" htmlFor="consultation-company">
              Company
              <input
                id="consultation-company"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                autoComplete="organization"
                className={`mt-2 ${fieldClass}`}
              />
            </label>
          </div>

          <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="checkbox"
              checked={stageB}
              onChange={(event) => setStageB(event.target.checked)}
              className="mt-1 size-5 shrink-0 accent-primary"
            />
            <span className="min-w-0 break-words text-base font-medium text-foreground">
              Add Stage B ($297)
            </span>
          </label>

          <div className="sticky bottom-0 z-30 -mx-4 border-t border-border bg-background/95 px-4 pt-3 backdrop-blur sm:-mx-6 sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <p className="text-base text-foreground">Due today {formatUsdFromCents(due)}.</p>
            {submitError ? <p className="mt-2 text-sm text-foreground">{submitError}</p> : null}
            <button
              type="submit"
              disabled={!ready || submitting}
              className={`${payClass} mt-3 disabled:opacity-50`}
            >
              Continue to payment
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export function ConsultationBookSuccessPage() {
  return (
    <section className={pageClass}>
      <div className={frameClass}>
        <h1 className={headingClass}>Consultation booked</h1>
        <p className="mt-6 break-words text-lg text-muted-foreground">
          Payment received — confirmation email with Meet link shortly
        </p>
      </div>
    </section>
  );
}

export function ConsultationBookCancelPage() {
  return (
    <section className={pageClass}>
      <div className={frameClass}>
        <h1 className={headingClass}>Checkout canceled</h1>
        <p className="mt-6 break-words text-lg text-muted-foreground">
          Checkout canceled. The hold expires on its own. You can pick another time.
        </p>
        <p className="mt-6">
          <a href={CONSULTATION_BOOK_PATH} className={payClass}>
            Pick another time
          </a>
        </p>
      </div>
    </section>
  );
}
