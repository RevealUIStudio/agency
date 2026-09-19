import { useState } from 'react';
import { ProofGapForm } from '@/components/agency/ProofGapForm';
import {
  PROOF_GAP_BULLETS,
  PROOF_GAP_H1,
  PROOF_GAP_HOW_TO,
  PROOF_GAP_KNOWN_FOR,
  PROOF_GAP_LADDER,
  PROOF_GAP_NEXT_STEPS,
  PROOF_GAP_OFFER_NAME,
  PROOF_GAP_ONE_GAP_PROMPT,
  PROOF_GAP_PROOF_LINE,
  PROOF_GAP_REFUSALS,
  PROOF_GAP_SCORE_BANDS,
  PROOF_GAP_SCORE_PROMPT,
  PROOF_GAP_SECTIONS,
  PROOF_GAP_SUB,
} from '@/content/proof-gap';

function ProofGapChecklist() {
  return (
    <section className="bg-muted py-16 sm:py-24" aria-labelledby="proof-gap-checklist-heading">
      <div className="mx-auto max-w-3xl px-6 space-y-12">
        <div>
          <h2
            id="proof-gap-checklist-heading"
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            {PROOF_GAP_OFFER_NAME}
          </h2>
          <p className="mt-4 text-base text-muted-foreground">{PROOF_GAP_PROOF_LINE}</p>
          <ol className="mt-6 list-decimal space-y-2 pl-5 text-base text-foreground">
            {PROOF_GAP_HOW_TO.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        {PROOF_GAP_SECTIONS.map((section) => (
          <article key={section.title}>
            <h3 className="text-xl font-semibold text-foreground">{section.title}</h3>
            <ul className="mt-4 space-y-3 text-base text-foreground">
              {section.checks.map((check) => (
                <li key={check.id}>
                  <span className="font-semibold">{check.id}</span>
                  {' · '}
                  {check.text}
                  <span className="mt-1 block text-sm text-muted-foreground">Y / P / N</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Red flag: </span>
              {section.redFlag}
            </p>
          </article>
        ))}

        <div>
          <h3 className="text-xl font-semibold text-foreground">Score</h3>
          <ul className="mt-4 space-y-2 text-base text-foreground">
            {PROOF_GAP_SCORE_BANDS.map((row) => (
              <li key={row.band}>
                <span className="font-semibold">{row.band}</span>
                {' · '}
                {row.meaning}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-base text-foreground">{PROOF_GAP_SCORE_PROMPT}</p>
          <p className="mt-2 text-base text-foreground">{PROOF_GAP_ONE_GAP_PROMPT}</p>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-foreground">Next steps (pick one)</h3>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-base text-foreground">
            {PROOF_GAP_NEXT_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-foreground">What we will not claim here</h3>
          <ul className="mt-4 space-y-2 text-base text-muted-foreground">
            {PROOF_GAP_REFUSALS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">{PROOF_GAP_KNOWN_FOR}</p>
          <p className="mt-2 text-sm text-muted-foreground">{PROOF_GAP_LADDER}</p>
        </div>
      </div>
    </section>
  );
}

export function ProofGapPage() {
  const [delivered, setDelivered] = useState(false);

  return (
    <>
      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            {PROOF_GAP_OFFER_NAME}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {PROOF_GAP_H1}
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">{PROOF_GAP_SUB}</p>
          <p className="mt-4 text-base text-muted-foreground">{PROOF_GAP_PROOF_LINE}</p>
          <p className="mt-4 text-sm text-muted-foreground">{PROOF_GAP_KNOWN_FOR}</p>

          <ul className="mt-10 space-y-3 text-base text-foreground">
            {PROOF_GAP_BULLETS.map((bullet) => (
              <li key={bullet} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          <div className="relative mt-12">
            <ProofGapForm onSuccess={() => setDelivered(true)} />
          </div>

          {!delivered && (
            <p className="mt-8 text-sm text-muted-foreground">
              Soft ask only. {PROOF_GAP_LADDER}. Paid work is invoiced after we agree.
            </p>
          )}
        </div>
      </section>
      {delivered && <ProofGapChecklist />}
    </>
  );
}
