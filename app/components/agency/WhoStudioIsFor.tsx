export const STUDIO_FOR_TITLE = 'Who Studio is for' as const;

export const STUDIO_FOR_BEATS = [
  'For technical founders and small agencies who already ship with agents, and need the business layer on their domain, not a wrapper around it.',
  'Not for hosted chatbot bolt-ons, Jobber swaps, or buying only for a compliance checkbox.',
  'You bring the domain. Studio ships booking, invoices, and agents with receipts. You operate, or you pay Launch to implement.',
] as const;

export function WhoStudioIsFor() {
  return (
    <section id="who" className="border-t border-border bg-muted py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {STUDIO_FOR_TITLE}
        </h2>
        <ol className="mt-8 list-none space-y-5">
          {STUDIO_FOR_BEATS.map((beat) => (
            <li key={beat} className="text-base leading-7 text-muted-foreground">
              {beat}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
