import {
  BookingCalendar,
  type BookingCalendarStatus,
  type BookingSlot,
  Button,
  Checkbox,
  CheckboxField,
  Description,
  FormField,
  Input,
  Label,
  LinkButton,
  Select,
} from '@revealui/presentation';
import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  bookingIdFromCheckoutUrl,
  CONSULTATION_AFTER_PAY,
  CONSULTATION_BOOK_INTRO,
  CONSULTATION_CANCEL,
  CONSULTATION_HOLD_NOTE,
  CONSULTATION_MEET_FALLBACK,
  CONSULTATION_PREP_BODY,
  CONSULTATION_READY_HINT,
  CONSULTATION_SUCCESS,
  CONSULTATION_SUCCESS_LOADING,
  CONSULTATION_SUCCESS_MISSING,
  CONSULTATION_SUCCESS_PENDING,
  type ConsultationBookingView,
  consultationBookDueCents,
  consultationEmptySlots,
  consultationStageLine,
  parseConsultationBookingPayload,
  readConsultationReceipt,
  rememberConsultationReceipt,
  STAGE_B_CHECKBOX,
  STAGE_B_DETAIL,
  STAGE_B_ON_ORDER,
} from '@/lib/consultation-buyer';
import {
  CONSULTATION_HOUR_MAX,
  CONSULTATION_HOUR_MIN,
  CONSULTATION_HOUR_OPTIONS,
  consultationHourLabel,
  DEFAULT_CONSULTATION_HOURS,
} from '@/lib/consultation-hours';
import { formatConsultationRange } from '@/lib/consultation-slots';
import { formatUsdFromCents } from '@/lib/money';
import { CONSULTATION_BOOK_PATH, CONTACT_EMAIL } from '@/lib/site';

interface Slot {
  readonly start: string;
  readonly end: string;
  readonly label: string;
}

interface CalendarFocus {
  readonly day: Date | null;
  readonly month: Date;
}

function assignCheckout(url: string) {
  window.location.assign(url);
}

function hoursFromLocation(): number {
  if (typeof window === 'undefined') return DEFAULT_CONSULTATION_HOURS;
  const raw = new URLSearchParams(window.location.search).get('hours');
  const count = Number(raw);
  if (Number.isInteger(count) && count >= CONSULTATION_HOUR_MIN && count <= CONSULTATION_HOUR_MAX) {
    return count;
  }
  return DEFAULT_CONSULTATION_HOURS;
}

function instantDate(start: string): Date | null {
  const date = new Date(start);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameLocalDay(start: string, day: Date): boolean {
  const date = instantDate(start);
  if (!date) return false;
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  );
}

function earliestSlotDate(slots: readonly Slot[]): Date | null {
  let earliest: Date | null = null;
  for (const slot of slots) {
    const date = instantDate(slot.start);
    if (!date) continue;
    if (!earliest || date.getTime() < earliest.getTime()) earliest = date;
  }
  return earliest;
}

function dayWithSlots(slots: readonly Slot[], day: Date | null): Date | null {
  if (slots.length === 0) return day;
  if (day && slots.some((slot) => sameLocalDay(slot.start, day))) return day;
  return earliestSlotDate(slots);
}

function slotStart(slot: BookingSlot): string {
  return typeof slot.start === 'string' ? slot.start : slot.start.toISOString();
}

const pageClass = 'min-w-0 max-w-full bg-background py-8 sm:py-24';
const frameClass = 'mx-auto min-w-0 max-w-3xl px-4 sm:px-6';
const headingClass = 'break-words text-3xl font-bold tracking-tight text-foreground sm:text-5xl';
const PAYBAR_HEIGHT_VAR = '--consultation-paybar-height';

export function ConsultationBookPage({
  onCheckout = assignCheckout,
}: {
  onCheckout?: (url: string) => void;
}) {
  const [hours, setHours] = useState<number>(hoursFromLocation);
  const [slots, setSlots] = useState<readonly Slot[]>([]);
  const [status, setStatus] = useState<BookingCalendarStatus>('loading');
  const [selected, setSelected] = useState('');
  const [focus, setFocus] = useState<CalendarFocus>(() => ({ day: null, month: new Date() }));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [stageB, setStageB] = useState(false);
  const [packOnOrder, setPackOnOrder] = useState(false);
  const [networkToken, setNetworkToken] = useState('');
  const [networkReady, setNetworkReady] = useState(false);
  const [networkPending, setNetworkPending] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(new URLSearchParams(window.location.search).get('nw')?.trim());
  });
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
    const nw = new URLSearchParams(window.location.search).get('nw')?.trim() ?? '';
    if (!nw) {
      setNetworkPending(false);
      setNetworkReady(true);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/consultation/network-status?nw=${encodeURIComponent(nw)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const body: unknown = await response.json();
        if (!body || typeof body !== 'object' || !('ok' in body) || body.ok !== true) return;
        setPackOnOrder(true);
        setStageB(true);
        setNetworkToken(nw);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setNetworkPending(false);
        setNetworkReady(true);
      });
    return () => controller.abort();
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
        setFocus((current) => {
          const day = dayWithSlots(next, current.day);
          return { day, month: day ?? current.month };
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setStatus('error');
      });
    return () => controller.abort();
  }, [hours, loadAttempt]);

  const due = consultationBookDueCents(hours, stageB, packOnOrder);
  const ready =
    networkReady && selected !== '' && name.trim().length > 0 && email.trim().length > 0;
  const selectedSlot = slots.find((slot) => slot.start === selected);
  const calendarSlots: BookingSlot[] = slots.map((slot) => ({
    id: slot.start,
    start: slot.start,
    end: slot.end,
    label: slot.label,
  }));

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
          stage_b: packOnOrder || stageB,
          ...(networkToken ? { network_token: networkToken } : {}),
        }),
      });
      if (response.status === 400) {
        const failure: unknown = await response.json().catch(() => null);
        const code =
          failure && typeof failure === 'object' && 'error' in failure ? failure.error : '';
        if (code === 'network-email') {
          setSubmitError('Use the email this link was issued for.');
          return;
        }
        if (code === 'network-token') {
          setSubmitError('This link is no longer valid.');
          return;
        }
      }
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
          <FormField id="consultation-book-hours" label="Consultation length">
            <Select
              id="consultation-book-hours"
              value={hours}
              onChange={(event) => setHours(Number(event.target.value))}
            >
              {CONSULTATION_HOUR_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {consultationHourLabel(count)}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="space-y-4">
            <BookingCalendar
              aria-label="Consultation calendar"
              disableDaysWithoutSlots
              id="consultation-open-slots"
              messages={{
                loading: 'Loading open slots.',
                emptyTitle: consultationEmptySlots(hours),
                emptyDescription: '',
                errorTitle: 'Could not load open slots.',
                errorDescription: '',
                unconfiguredTitle: 'Booking is not available on this server yet.',
                unconfiguredDescription: '',
                slotsLabel: 'Open slots',
                noSlotsTitle: 'No open slots this day.',
                noSlotsDescription: '',
              }}
              month={focus.month}
              name="slot"
              onChange={(slot) => setSelected(slot ? slotStart(slot) : '')}
              onMonthChange={(month) => setFocus((current) => ({ ...current, month }))}
              onSelectedDateChange={(date) => setFocus({ day: date, month: date })}
              selectedDate={focus.day}
              slots={calendarSlots}
              status={status}
              value={selected === '' ? null : selected}
            />
            {status === 'error' ? (
              <Button
                appearance="outline"
                className="w-full min-h-12"
                onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                size="lg"
                type="button"
                variant="neutral"
              >
                Try again
              </Button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <FormField id="consultation-name" label="Name">
              <Input
                id="consultation-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
              />
            </FormField>
            <FormField id="consultation-email" label="Email">
              <Input
                id="consultation-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </FormField>
            <FormField id="consultation-company" label="Company (optional)">
              <Input
                id="consultation-company"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                autoComplete="organization"
              />
            </FormField>
          </div>

          {networkPending ? (
            <p className="text-sm text-muted-foreground">Checking this order.</p>
          ) : packOnOrder ? (
            <p className="rounded-xl border border-border px-4 py-3 text-base font-medium text-foreground">
              {STAGE_B_ON_ORDER}
            </p>
          ) : (
            <div>
              <CheckboxField className="rounded-xl border border-border px-4 py-3">
                <Checkbox
                  aria-describedby="consultation-stage-b"
                  aria-labelledby="consultation-stage-b-label"
                  checked={stageB}
                  onChange={setStageB}
                />
                <Label id="consultation-stage-b-label">{STAGE_B_CHECKBOX}</Label>
              </CheckboxField>
              <Description className="mt-2" id="consultation-stage-b">
                {STAGE_B_DETAIL}
              </Description>
            </div>
          )}

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
              <Button
                className="mt-2 w-full min-h-12 sm:mt-3"
                disabled={!ready || submitting}
                isLoading={submitting}
                size="lg"
                type="submit"
              >
                {submitting ? 'Starting checkout' : 'Continue to payment'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

function bookingIdFromLocation(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('booking')?.trim() ?? '';
}

export function ConsultationBookSuccessPage() {
  const bookingId = bookingIdFromLocation();
  const receipt = readConsultationReceipt(bookingId);
  const [view, setView] = useState<ConsultationBookingView | 'loading' | 'error'>(
    bookingId ? 'loading' : { kind: 'missing' },
  );

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    const url = `/api/consultation/booking?booking=${encodeURIComponent(bookingId)}`;
    fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error('booking');
        return response.json() as Promise<unknown>;
      })
      .then((body) => {
        if (!cancelled) setView(parseConsultationBookingPayload(body));
      })
      .catch(() => {
        if (!cancelled) setView('error');
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const paid = typeof view === 'object' && view.kind === 'paid' ? view : null;
  const whenLabel = paid
    ? formatConsultationRange(new Date(paid.start), new Date(paid.end))
    : (receipt?.label ?? null);
  const stageB = paid ? paid.stageB : receipt ? receipt.stageB : null;
  const meetUrl = paid?.meetLink ?? null;
  const pending = typeof view === 'object' && view.kind === 'pending';
  let meetCopy = CONSULTATION_MEET_FALLBACK;
  if (view === 'loading') meetCopy = CONSULTATION_SUCCESS_LOADING;
  else if (pending) meetCopy = CONSULTATION_SUCCESS_PENDING;
  else if (!meetUrl && !whenLabel) meetCopy = CONSULTATION_SUCCESS_MISSING;

  return (
    <section className={pageClass}>
      <div className={frameClass}>
        <h1 className={headingClass}>Consultation booked</h1>
        <p className="mt-6 break-words text-lg text-muted-foreground">{CONSULTATION_SUCCESS}</p>
        {whenLabel ? (
          <div className="mt-6">
            <p className="text-sm font-semibold text-foreground">When</p>
            <p className="mt-1 break-words text-base font-semibold text-foreground">{whenLabel}</p>
          </div>
        ) : null}
        {meetUrl ? (
          <p className="mt-4 break-words text-base text-foreground">
            Google Meet:{' '}
            <a href={meetUrl} className="break-all font-semibold text-foreground hover:underline">
              {meetUrl}
            </a>
          </p>
        ) : (
          <p className="mt-4 break-words text-base text-muted-foreground">{meetCopy}</p>
        )}
        {stageB !== null ? (
          <p className="mt-4 break-words text-base text-muted-foreground">
            {consultationStageLine(stageB)}
          </p>
        ) : null}
        <div className="mt-4">
          <p className="text-sm font-semibold text-foreground">Prep</p>
          <p className="mt-1 break-words text-base text-muted-foreground">
            {CONSULTATION_PREP_BODY}
          </p>
        </div>
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
          <LinkButton className="w-full min-h-12" href={CONSULTATION_BOOK_PATH} size="lg">
            Pick another time
          </LinkButton>
        </p>
      </div>
    </section>
  );
}
