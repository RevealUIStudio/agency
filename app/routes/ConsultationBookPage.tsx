import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  bookingIdFromCheckoutUrl,
  CONSULTATION_AFTER_PAY,
  CONSULTATION_BOOK_INTRO,
  CONSULTATION_CANCEL,
  CONSULTATION_HOLD_NOTE,
  CONSULTATION_PREP_BODY,
  CONSULTATION_READY_HINT,
  CONSULTATION_SUCCESS,
  consultationEmptySlots,
  consultationStageLine,
  readConsultationReceipt,
  rememberConsultationReceipt,
  STAGE_B_CHECKBOX,
  STAGE_B_DETAIL,
} from '@/lib/consultation-buyer';
import {
  CONSULTATION_HOUR_OPTIONS,
  consultationDueCents,
  consultationHourCount,
  consultationHourLabel,
  DEFAULT_CONSULTATION_HOURS,
} from '@/lib/consultation-hours';
import { formatUsdFromCents } from '@/lib/money';
import { CONSULTATION_BOOK_PATH, CONTACT_EMAIL } from '@/lib/site';
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
const PAYBAR_HEIGHT_VAR = '--consultation-paybar-height';

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
  const [loadAttempt, setLoadAttempt] = useState(0);
  const payBarRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = payBarRef.current;
    if (!node) return;
    const write = () => {
      document.documentElement.style.setProperty(PAYBAR_HEIGHT_VAR, `${node.offsetHeight}px`);
    };
    write();
    if (typeof ResizeObserver === 'undefined') {
      return () => {
        document.documentElement.style.removeProperty(PAYBAR_HEIGHT_VAR);
      };
    }
    const observer = new ResizeObserver(write);
    observer.observe(node);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty(PAYBAR_HEIGHT_VAR);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setSelected('');
    setStatus('loading');
    const params = new URLSearchParams({ hours: String(hours) });
    if (loadAttempt > 0) params.set('retry', String(loadAttempt));
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
  }, [hours, loadAttempt]);

  const due = consultationDueCents(consultationHourCount(hours)) + (stageB ? STAGE_B_CENTS : 0);
  const ready = selected !== '' && name.trim().length > 0 && email.trim().length > 0;
  const selectedSlot = slots.find((slot) => slot.start === selected);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slot = slots.find((item) => item.start === selected);
    if (!slot || !ready) return;
    setSubmitting(true);
    setSubmitError('');
    let handedOff = false;
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
      rememberConsultationReceipt(bookingIdFromCheckoutUrl(checkoutUrl), {
        label: slot.label,
        stageB,
      });
      onCheckout(checkoutUrl);
      handedOff = true;
    } catch {
      setSubmitError('Could not start checkout.');
    } finally {
      if (!handedOff) setSubmitting(false);
    }
  }

  return (
    <section className={pageClass}>
      <div className={frameClass}>
        <h1 className={headingClass}>Book a Consultation</h1>
        <p className="mt-6 break-words text-lg text-muted-foreground">{CONSULTATION_BOOK_INTRO}</p>

        <form
          className="mt-4 space-y-5 pb-[calc(var(--consultation-paybar-height,12rem)+1rem)] sm:mt-10 sm:space-y-8"
          onSubmit={onSubmit}
        >
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
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Could not load open slots.</p>
                <button
                  type="button"
                  className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-base font-semibold text-foreground"
                  onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                >
                  Try again
                </button>
              </div>
            ) : null}
            {status === 'empty' ? (
              <p className="mt-4 text-sm text-muted-foreground">{consultationEmptySlots(hours)}</p>
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
              Company (optional)
              <input
                id="consultation-company"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                autoComplete="organization"
                className={`mt-2 ${fieldClass}`}
              />
            </label>
          </div>

          <div>
            <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="checkbox"
                checked={stageB}
                onChange={(event) => setStageB(event.target.checked)}
                aria-describedby="consultation-stage-b"
                className="mt-1 size-5 shrink-0 accent-primary"
              />
              <span className="min-w-0 break-words text-base font-medium text-foreground">
                {STAGE_B_CHECKBOX}
              </span>
            </label>
            <p id="consultation-stage-b" className="mt-2 text-sm text-muted-foreground">
              {STAGE_B_DETAIL}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">{CONSULTATION_HOLD_NOTE}</p>
            <p className="mt-1 text-sm text-muted-foreground">{CONSULTATION_AFTER_PAY}</p>
          </div>

          <div
            ref={payBarRef}
            className="fixed inset-x-0 z-30 border-t border-border bg-background px-4 pt-2 bottom-[var(--cookie-banner-height,0px)] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-3"
          >
            <div className="mx-auto w-full min-w-0 max-w-3xl">
              {selectedSlot ? (
                <p className="break-words text-base font-semibold text-foreground">
                  {selectedSlot.label}
                </p>
              ) : null}
              <p
                className={
                  selectedSlot ? 'mt-2 text-base text-foreground' : 'text-base text-foreground'
                }
              >
                Due today {formatUsdFromCents(due)}.
              </p>
              {!ready && !submitting ? (
                <p className="mt-2 text-sm text-muted-foreground">{CONSULTATION_READY_HINT}</p>
              ) : null}
              {submitError ? <p className="mt-2 text-sm text-foreground">{submitError}</p> : null}
              <button
                type="submit"
                disabled={!ready || submitting}
                className={`${payClass} mt-2 disabled:opacity-50 sm:mt-3`}
              >
                {submitting ? 'Starting checkout' : 'Continue to payment'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

export function ConsultationBookSuccessPage() {
  const bookingId =
    typeof window === 'undefined'
      ? ''
      : (new URLSearchParams(window.location.search).get('booking') ?? '');
  const receipt = readConsultationReceipt(bookingId);
  return (
    <section className={pageClass}>
      <div className={frameClass}>
        <h1 className={headingClass}>Consultation booked</h1>
        {receipt ? (
          <>
            <p className="mt-6 break-words text-base font-semibold text-foreground">
              {receipt.label}
            </p>
            <p className="mt-2 break-words text-base text-muted-foreground">
              {consultationStageLine(receipt.stageB)}
            </p>
          </>
        ) : null}
        <p className="mt-6 break-words text-lg text-muted-foreground">{CONSULTATION_SUCCESS}</p>
        <p className="mt-4 break-words text-base text-muted-foreground">{CONSULTATION_PREP_BODY}</p>
        <p className="mt-4 break-words text-base text-muted-foreground">
          Questions:{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-semibold text-foreground hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
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
        <p className="mt-6 break-words text-lg text-muted-foreground">{CONSULTATION_CANCEL}</p>
        <p className="mt-6">
          <a href={CONSULTATION_BOOK_PATH} className={payClass}>
            Pick another time
          </a>
        </p>
      </div>
    </section>
  );
}
