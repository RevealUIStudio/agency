import { useLocation, useRouter } from '@revealui/router';
import { useEffect } from 'react';
import {
  STUDIO_BLOG_FEED_PATH,
  STUDIO_BLOG_FEED_TITLE,
  STUDIO_BLOG_FEED_TYPE,
} from '@/lib/blog-copy';
import { headForPathname, normalizePathname, type StudioHead } from '@/lib/route-documents';
import { clientSlugFromHost } from '@/lib/share-host';

/**
 * Keeps the document head aligned with the active route after client navigation.
 *
 * Known routes are also stamped into the built HTML, so a scraper that does not
 * run JavaScript already sees the same title, description, canonical, and social
 * tags. This effect covers in-app navigations, including a missing blog slug.
 */

function upsertMeta(attr: 'name' | 'property', key: string, content: string | null): void {
  const existing = document.querySelector(`meta[${attr}="${key}"]`);
  if (!content) {
    existing?.remove();
    return;
  }
  const tag = existing ?? document.createElement('meta');
  tag.setAttribute(attr, key);
  tag.setAttribute('content', content);
  if (!existing) document.head.appendChild(tag);
}

function upsertCanonical(href: string | null): void {
  const existing = document.querySelector('link[rel="canonical"]');
  if (!href) {
    existing?.remove();
    return;
  }
  const link = existing ?? document.createElement('link');
  link.setAttribute('rel', 'canonical');
  link.setAttribute('href', href);
  if (!existing) document.head.appendChild(link);
}

function removeFeedLink(): void {
  for (const node of document.querySelectorAll(
    `link[rel="alternate"][type="${STUDIO_BLOG_FEED_TYPE}"]`,
  )) {
    node.remove();
  }
}

function ensureBlogFeedLink(): void {
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

function applyHead(head: StudioHead): void {
  document.title = head.title;
  upsertMeta('name', 'description', head.description);
  upsertMeta('name', 'robots', head.robots);
  upsertMeta('property', 'og:type', head.ogType);
  upsertMeta('property', 'og:title', head.title);
  upsertMeta('property', 'og:description', head.description);
  upsertMeta('property', 'og:image:alt', head.title);
  upsertMeta('name', 'twitter:title', head.title);
  upsertMeta('name', 'twitter:description', head.description);
  upsertCanonical(head.canonicalHref);
  upsertMeta('property', 'og:url', head.canonicalHref);
  upsertMeta('name', 'twitter:url', head.canonicalHref);
  if (head.feed) ensureBlogFeedLink();
  else removeFeedLink();
}

function shareCanonical(pathname: string): string {
  const path = normalizePathname(pathname);
  return `https://${window.location.hostname}${path === '/' ? '/' : path}`;
}

export function RouteHead() {
  const router = useRouter();
  const { pathname } = useLocation();

  useEffect(() => {
    const shareSlug = clientSlugFromHost(window.location.hostname);
    if (shareSlug) {
      const meta = router.match(pathname)?.route.meta;
      const title = typeof meta?.title === 'string' ? meta.title : document.title;
      const description = typeof meta?.description === 'string' ? meta.description : '';
      const robots = typeof meta?.robots === 'string' ? meta.robots : 'noindex,nofollow';
      const href = shareCanonical(pathname);
      document.title = title;
      upsertMeta('name', 'description', description);
      upsertMeta('name', 'robots', robots);
      upsertMeta('property', 'og:title', title);
      upsertMeta('property', 'og:description', description);
      upsertMeta('name', 'twitter:title', title);
      upsertMeta('name', 'twitter:description', description);
      upsertCanonical(href);
      upsertMeta('property', 'og:url', href);
      upsertMeta('name', 'twitter:url', href);
      removeFeedLink();
      return;
    }
    applyHead(headForPathname(pathname));
  }, [router, pathname]);

  return null;
}
