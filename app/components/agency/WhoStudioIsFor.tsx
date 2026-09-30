export const STUDIO_FOR_TITLE = 'For teams ready to operate what they build.' as const;

export const STUDIO_FOR_AGENCY =
  'For agency work, the delivered system lives on your client’s accounts. You can hand over the code, data, and operating notes.' as const;

export const STUDIO_FOR_BEATS = [
  'You already use agents and have a workflow that needs accounts, billing, integrations, or a dependable handoff.',
  'You will need someone to maintain the infrastructure and software after handoff. We will discuss that responsibility before work starts.',
  'I help turn your workflow into a system your team can run on its own accounts.',
] as const;

export function WhoStudioIsFor() {
  return (
    <section id="who" className="border-t border-border bg-muted py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {STUDIO_FOR_TITLE}
        </h2>
        <p className="mt-6 text-base leading-7 text-muted-foreground">{STUDIO_FOR_AGENCY}</p>
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
