import { DOCS_URL } from '@/lib/site';

/** Visible pointer to product setup steps. */
export function BlogDocsBoundary() {
  return (
    <>
      Need setup steps? Read the{' '}
      <a
        href={DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-foreground hover:underline"
      >
        RevealUI docs
      </a>
      .
    </>
  );
}
