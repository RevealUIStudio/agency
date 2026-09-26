import { Link } from '@revealui/router';
import { formatBlogDate, publishedBlogPosts } from '@/data/blog';
import { DOCS_URL } from '@/lib/site';

export function BlogPage() {
  return (
    <>
      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Blog</h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Essays from Joshua Vaughn and RevealUI Studio. Founder notes, the runtime, and what it
            takes to leave a system someone else can run.
          </p>
          <p className="mt-4 text-base text-muted-foreground">
            Product reference stays in{' '}
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground hover:underline"
            >
              Documentation
            </a>
            .
          </p>
        </div>
      </section>

      <section className="bg-muted py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          {publishedBlogPosts.length === 0 ? (
            <p className="text-base text-muted-foreground">No essays are published yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {publishedBlogPosts.map((post) => (
                <article
                  key={post.slug}
                  className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm"
                >
                  <p className="text-xs font-medium uppercase tracking-widest text-primary">
                    <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
                    {' · '}
                    {post.author}
                  </p>
                  <h2 className="mt-2 text-lg font-bold tracking-tight text-foreground">
                    <Link to={`/blog/${post.slug}`} className="hover:underline">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mt-4 flex-1 text-sm text-muted-foreground">{post.excerpt}</p>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="mt-6 text-sm font-semibold text-foreground hover:underline"
                  >
                    Read essay
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
