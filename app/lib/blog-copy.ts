/**
 * Admitted Studio blog vs docs copy (2026-09-26).
 * Ids: studio-blog-home-h1-2026-09-26, studio-blog-home-sub-2026-09-26,
 * nav-blog-studio-2026-09-26, nav-docs-product-2026-09-26,
 * boundary-blog-studio-docs-ref-2026-09-26.
 * The Studio blog stays on this site. Setup steps live in the RevealUI docs.
 */

export const STUDIO_BLOG_HOME_H1 = 'Own the stack. Keep the receipts.';

export const STUDIO_BLOG_HOME_SUB =
  'Studio writes for technical founders and small agencies who already run agents. Existing tools report in. You keep the stack. Need setup steps? Read the RevealUI docs.';

/** Channel title and alternate-link title for the Studio blog feed. */
export const STUDIO_BLOG_FEED_TITLE = 'RevealUI Studio Blog';

export const STUDIO_BLOG_FEED_PATH = '/rss.xml';

export const STUDIO_BLOG_FEED_TYPE = 'application/rss+xml';

/** Exact head tag for blog documents. Href stays relative and has no campaign params. */
export const STUDIO_BLOG_FEED_ALTERNATE_TAG = [
  '<link rel="alternate"',
  `type="${STUDIO_BLOG_FEED_TYPE}"`,
  `title="${STUDIO_BLOG_FEED_TITLE}"`,
  `href="${STUDIO_BLOG_FEED_PATH}">`,
].join(' ');

/** nav-blog-studio-2026-09-26. Href is the Studio blog home. */
export const BLOG_NAV_LABEL = 'Blog';

/** nav-docs-product-2026-09-26. Href is the product docs origin. */
export const DOCS_NAV_LABEL = 'Docs';

export const BLOG_DOCS_BOUNDARY = 'Need setup steps? Read the RevealUI docs.';
