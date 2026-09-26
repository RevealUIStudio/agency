import { DOCS_URL } from '@/lib/site';

/** boundary-blog-studio-docs-ref-2026-09-26. Visible text is the locked sentence. */
export function BlogDocsBoundary() {
  return (
    <>
      Blog is on Studio.{' '}
      <a
        href={DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-foreground hover:underline"
      >
        Docs
      </a>{' '}
      are product reference.
    </>
  );
}
