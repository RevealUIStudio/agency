import { Link } from '@revealui/router';
import { BlogDocsBoundary } from '@/components/BlogDocsBoundary';
import { formatBlogDate, publishedBlogPosts } from '@/data/blog';
import { STUDIO_BLOG_HOME_H1, STUDIO_BLOG_HOME_SUB } from '@/lib/blog-copy';

export function BlogPage() {
  return (
    <>
      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {STUDIO_BLOG_HOME_H1}
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">{STUDIO_BLOG_HOME_SUB}</p>
          <p className="mt-4 text-base text-muted-foreground">
            <BlogDocsBoundary />
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
