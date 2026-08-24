import { LinkButton } from '@revealui/presentation';
import { useState } from 'react';
import {
  buildQuote,
  DEFAULT_HOSTER,
  DEFAULT_OUTCOME,
  DEFAULT_PLACES,
  HOSTER_OPTIONS,
  type Hoster,
  OUTCOME_OPTIONS,
  type Outcome,
  PLACES_OPTIONS,
  type Places,
  QUOTE_CALCULATOR_LEAD,
  QUOTE_INTRO_LINE,
  QUOTE_OWNERSHIP,
} from '@/lib/quote';
import { INTRO_CALL_URL } from '@/lib/site';

function ChoiceGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-base font-semibold text-foreground">{legend}</legend>
      <div className="mt-4 space-y-3">
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="mt-1 size-4 accent-primary"
              />
              <span className="text-sm font-medium text-foreground">{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function QuoteCalculator() {
  const [hoster, setHoster] = useState<Hoster>(DEFAULT_HOSTER);
  const [outcome, setOutcome] = useState<Outcome>(DEFAULT_OUTCOME);
  const [places, setPlaces] = useState<Places>(DEFAULT_PLACES);
  const quote = buildQuote({ hoster, outcome, places });

  return (
    <section id="calculator" className="scroll-mt-20 bg-muted py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Quote</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Three questions. A price you can read.
          </h2>
          <p className="mt-4 text-base text-muted-foreground">{QUOTE_CALCULATOR_LEAD}</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
            <ChoiceGroup
              legend="Who puts it live?"
              name="hoster"
              value={hoster}
              options={HOSTER_OPTIONS}
              onChange={setHoster}
            />
            <ChoiceGroup
              legend="What has to work?"
              name="outcome"
              value={outcome}
              options={OUTCOME_OPTIONS}
              onChange={setOutcome}
            />
            <ChoiceGroup
              legend="How many places?"
              name="places"
              value={places}
              options={PLACES_OPTIONS}
              onChange={setPlaces}
            />
          </div>

          <aside
            className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
            aria-live="polite"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {quote.stopQuoting ? 'Intro' : 'Quote'}
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {quote.heading}
            </h3>
            {quote.body ? <p className="mt-3 text-sm text-muted-foreground">{quote.body}</p> : null}

            {quote.lines.length > 0 ? (
              <ul className="mt-6 space-y-4">
                {quote.lines.map((line) => (
                  <li
                    key={line.id}
                    className={
                      line.highlighted
                        ? 'rounded-xl border border-primary bg-primary/5 p-4'
                        : 'rounded-xl border border-border p-4'
                    }
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{line.title}</p>
                      <p className="text-lg font-bold tracking-tight text-foreground">
                        {line.price}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{line.detail}</p>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-6 space-y-2 text-sm text-foreground">
              {QUOTE_OWNERSHIP.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{QUOTE_INTRO_LINE}</p>
            <div className="mt-8 flex flex-col gap-3">
              {quote.productHandoffUrl ? (
                <LinkButton
                  href={quote.productHandoffUrl}
                  external
                  className="w-full justify-center"
                >
                  Start free
                </LinkButton>
              ) : null}
              <LinkButton
                href={INTRO_CALL_URL}
                external
                appearance={quote.productHandoffUrl ? 'outline' : undefined}
                variant={quote.productHandoffUrl ? 'neutral' : undefined}
                className="w-full justify-center"
              >
                Book a 30-minute intro
              </LinkButton>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
