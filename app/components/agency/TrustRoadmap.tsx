import { TRUST_FAQ, TRUST_ROADMAP, TRUST_SHORT, TRUST_TITLE } from '@/content/trust';

export function TrustRoadmap() {
  return (
    <section id="trust" className="border-t border-border bg-muted py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {TRUST_TITLE}
        </h2>
        <div className="mt-6 space-y-4">
          {TRUST_SHORT.map((para) => (
            <p key={para} className="text-base leading-7 text-muted-foreground">
              {para}
            </p>
          ))}
        </div>

        <div className="mt-12 space-y-8">
          {TRUST_ROADMAP.map((bucket) => (
            <div key={bucket.label}>
              <h3 className="text-lg font-semibold text-foreground">{bucket.label}</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-muted-foreground">
                {bucket.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 space-y-6">
          {TRUST_FAQ.map((item) => (
            <div key={item.q}>
              <h3 className="text-lg font-semibold text-foreground">{item.q}</h3>
              <p className="mt-2 text-base leading-7 text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
