import { Link } from '@revealui/router';
import { type FormEvent, useEffect, useState } from 'react';
import {
  BOOK_EMPTY,
  BOOK_INVALID,
  BOOK_PAGE_HEADING,
  BOOK_PAGE_LEAD,
  BOOK_SLOT_TAKEN,
  BOOK_SUBMIT_LABEL,
  BOOK_UNAVAILABLE,
  CONSULTATION_BOOK_META,
  type ConsultationSlot,
  consultationCheckoutCents,
  redirectToCheckout,
  STAGE_B_ADDON_DETAIL,
  STAGE_B_ADDON_LABEL,
} from '@/lib/consultation-book';
import {
  CONSULTATION_HOUR_OPTIONS,
  consultationHourLabel,
  DEFAULT_CONSULTATION_HOURS,
} from '@/lib/consultation-hours';
import { formatUsdFromCents } from '@/lib/money';

export { CONSULTATION_BOOK_META };

interface BookPayload {
  readonly checkout_url?: unknown;
  readonly error?: unknown;
}

function isSlot(value: unknown): value is ConsultationSlot {
  if (!value || typeof value !== 'object') return false;
  const slot = value as Record<string, unknown>;
  return (
    typeof slot.start === 'string' &&
    typeof slot.end === 'string' &&
    typeof slot.label === 'string' &&
    typeof slot.dayLabel === 'string'
  );
}

function messageFor(error: unknown): string {
  if (error === 'slot-taken') return BOOK_SLOT_TAKEN;
  if (error === 'invalid') return BOOK_INVALID;
  return BOOK_UNAVAILABLE;
}

export function ConsultationBookPage({ go = redirectToCheckout }: { go?: (url: string) => void }) {
  const [hours, setHours] = useState<number>(DEFAULT_CONSULTATION_HOURS);
  const [slots, setSlots] = useState<readonly ConsultationSlot[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [stageB, setStageB] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`/api/consultation/availability?hours=${hours}`)
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok || !body || typeof body !== 'object') {
          throw new Error('unavailable');
        }
        const list =
          'slots' in body && Array.isArray(body.slots) ? body.slots.filter(isSlot) : null;
        if (!list) throw new Error('unavailable');
        if (!cancelled) {
          setSlots(list);
          setSelected('');
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlots([]);
          setLoading(false);
          setError(BOOK_UNAVAILABLE);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hours]);

  const days = [...new Set(slots.map((slot) => slot.dayLabel))];
  const chosen = slots.find((slot) => slot.start === selected) ?? null;
  const due = formatUsdFromCents(consultationCheckoutCents(hours, stageB));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !chosen) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/consultation/book', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          start: chosen.start,
          end: chosen.end,
          hours,
          name,
          email,
          company,
          stage_b: stageB,
        }),
      });
      const body = (await response.json().catch(() => null)) as BookPayload | null;
      if (response.ok && body && typeof body.checkout_url === 'string') {
        go(body.checkout_url);
        return;
      }
      setError(messageFor(body?.error));
      setSubmitting(false);
    } catch {
      setError(BOOK_UNAVAILABLE);
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Consultation</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {BOOK_PAGE_HEADING}
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">{BOOK_PAGE_LEAD}</p>

        <form className="mt-12 space-y-8" onSubmit={(event) => void onSubmit(event)}>
          <div>
            <label
              htmlFor="consultation-length"
              className="text-base font-semibold text-foreground"
            >
              Length
            </label>
            <select
              id="consultation-length"
              value={hours}
              onChange={(event) => setHours(Number(event.target.value))}
              className="mt-4 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground"
            >
              {CONSULTATION_HOUR_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {consultationHourLabel(count)}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="text-base font-semibold text-foreground">Open times</legend>
            <p className="mt-2 text-sm text-muted-foreground">Eastern Time. Weekdays only.</p>
            {loading ? (
              <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
                Loading times
              </p>
            ) : null}
            {!loading && slots.length === 0 && !error ? (
              <p className="mt-4 text-sm text-muted-foreground">{BOOK_EMPTY}</p>
            ) : null}
            <div className="mt-4 max-h-96 space-y-6 overflow-y-auto">
              {days.map((day) => (
                <div key={day}>
                  <h2 className="text-sm font-semibold text-foreground">{day}</h2>
                  <div className="mt-3 space-y-2">
                    {slots
                      .filter((slot) => slot.dayLabel === day)
                      .map((slot) => {
                        const id = `slot-${slot.start}`;
                        return (
                          <label
                            key={slot.start}
                            htmlFor={id}
                            className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                          >
                            <input
                              id={id}
                              type="radio"
                              name="slot"
                              value={slot.start}
                              checked={selected === slot.start}
                              onChange={() => setSelected(slot.start)}
                              className="size-4 accent-primary"
                            />
                            <span className="text-sm font-medium text-foreground">
                              {slot.label}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="buyer-name" className="text-sm font-semibold text-foreground">
                Name
              </label>
              <input
                id="buyer-name"
                name="name"
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
              />
            </div>
            <div>
              <label htmlFor="buyer-email" className="text-sm font-semibold text-foreground">
                Email
              </label>
              <input
                id="buyer-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
              />
            </div>
          </div>
          <div>
            <label htmlFor="buyer-company" className="text-sm font-semibold text-foreground">
              Company
            </label>
            <input
              id="buyer-company"
              name="company"
              autoComplete="organization"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="checkbox"
              name="stage_b"
              checked={stageB}
              onChange={(event) => setStageB(event.target.checked)}
              className="mt-1 size-4 accent-primary"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                {STAGE_B_ADDON_LABEL}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {STAGE_B_ADDON_DETAIL}
              </span>
            </span>
          </label>

          <p className="text-sm font-semibold text-foreground">Checkout total {due}.</p>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!chosen || submitting || loading}
            className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {BOOK_SUBMIT_LABEL}
          </button>
        </form>
        <p className="mt-8 text-sm text-muted-foreground">
          <Link to="/" className="font-semibold text-foreground hover:underline">
            Back to the studio
          </Link>
        </p>
      </div>
    </section>
  );
}
