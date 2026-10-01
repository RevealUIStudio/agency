import { TRUST_FAQ, TRUST_SHORT, TRUST_TITLE } from '@/content/trust';

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

        <div id="trust-faq" className="mt-12 space-y-6">
          <h3 className="text-xl font-semibold text-foreground">Security and compliance FAQ</h3>
          {TRUST_FAQ.map((item) => (
            <details key={item.q} className="border-b border-border pb-4">
              <summary className="cursor-pointer text-lg font-semibold text-foreground">
                {item.q}
              </summary>
              <p className="mt-2 text-base leading-7 text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
