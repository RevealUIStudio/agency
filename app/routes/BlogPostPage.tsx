import { Link, useParams } from '@revealui/router';
import { BlogDocsBoundary } from '@/components/BlogDocsBoundary';
import { findPublishedBlogPost, formatBlogDate } from '@/data/blog';
import { BlogMarkdown } from '@/lib/blog-markdown';
import { INTRO_CALL_URL } from '@/lib/site';
import { NotFoundPage } from './NotFoundPage';

export function BlogPostPage() {
  const { slug } = useParams<{ slug?: string }>();
  const post = slug ? findPublishedBlogPost(slug) : undefined;

  if (!post) return <NotFoundPage />;

  return (
    <>
      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <Link
            to="/blog"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Back to Blog
          </Link>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
            {' · '}
            {post.author}
          </p>
        </div>
      </section>

      <article className="bg-muted py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-6">
          <BlogMarkdown source={post.content} />
          <div className="mt-16 border-t border-border pt-8">
            <p className="text-base text-muted-foreground">
              <BlogDocsBoundary />{' '}
              <a
                href={INTRO_CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground hover:underline"
              >
                Book a 30-minute intro
              </a>
              .
            </p>
          </div>
        </div>
      </article>
    </>
  );
}
