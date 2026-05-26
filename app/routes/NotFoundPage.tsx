export function NotFoundPage() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center bg-background px-6 py-16">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-4 max-w-md text-base text-muted-foreground">
          The page you're looking for isn't here. Try the home page or contact us if you think
          something is broken.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <a
            href="/"
            className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Return home
          </a>
          <a
            href="/contact"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Contact us →
          </a>
        </div>
      </div>
    </section>
  );
}
