import { useLocation, useRouter } from '@revealui/router';
import { useEffect } from 'react';
import {
  STUDIO_BLOG_FEED_PATH,
  STUDIO_BLOG_FEED_TITLE,
  STUDIO_BLOG_FEED_TYPE,
} from '@/lib/blog-copy';

/**
 * Applies the active route's metadata to the document head on client-side
 * navigation.
 *
 * @revealui/router stores `meta.title` / `meta.description` per route (see
 * App.tsx) but does not itself write them to the document, and this site is a
 * client-rendered SPA with no SSR. Without this, every route would keep the
 * single static <title> from index.html. We set `document.title` directly
 * (rather than rendering a hoistable <title>) so it deterministically overrides
 * the static index.html title instead of competing with it.
 *
 * Renders nothing.
 *
 * Blog paths also keep the RSS alternate link. The shell document carries the
 * same tag so the first HTML response for a blog URL includes it.
 */
function isStudioBlogPath(pathname: string): boolean {
  return pathname === '/blog' || pathname.startsWith('/blog/');
}

function ensureBlogFeedLink(pathname: string): void {
  if (!isStudioBlogPath(pathname)) return;
  let link = document.querySelector<HTMLLinkElement>(
    `link[rel="alternate"][type="${STUDIO_BLOG_FEED_TYPE}"]`,
  );
  if (!link) {
    link = document.createElement('link');
    document.head.appendChild(link);
  }
  link.setAttribute('rel', 'alternate');
  link.setAttribute('type', STUDIO_BLOG_FEED_TYPE);
  link.setAttribute('title', STUDIO_BLOG_FEED_TITLE);
  link.setAttribute('href', STUDIO_BLOG_FEED_PATH);
}

export function RouteHead() {
  const router = useRouter();
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = router.match(pathname)?.route.meta;
    if (meta?.title) {
      document.title = meta.title;
    }
    if (meta?.description) {
      const tag = document.querySelector('meta[name="description"]');
      tag?.setAttribute('content', meta.description);
    }
    const robots = typeof meta?.robots === 'string' ? meta.robots : 'index,follow';
    let robotsTag = document.querySelector('meta[name="robots"]');
    if (!robotsTag) {
      robotsTag = document.createElement('meta');
      robotsTag.setAttribute('name', 'robots');
      document.head.appendChild(robotsTag);
    }
    robotsTag.setAttribute('content', robots);
    ensureBlogFeedLink(pathname);
  }, [router, pathname]);

  return null;
}
