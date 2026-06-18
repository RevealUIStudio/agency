import { useLocation, useRouter } from '@revealui/router';
import { useEffect } from 'react';

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
 */
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
  }, [router, pathname]);

  return null;
}
