/**
 * Per-route document head for revealuistudio.com.
 *
 * The build writes one HTML file per known route from this list so a scraper
 * that does not run JavaScript sees the title, description, canonical, and
 * social tags. Client navigations apply the same record in RouteHead.
 * Unknown paths, including a blog slug that is not published, are not files.
 * The host serves 404.html for those requests.
 */

import { BLOG_ENTRIES, type BlogEntry, docsBlogPath } from '../../content/blog/registry';
import {
  PROOF_GAP_DOCUMENT_TITLE,
  PROOF_GAP_META_DESCRIPTION,
  PROOF_GAP_PATH,
} from '../content/proof-gap';
import { publishedCases } from '../data/cases';
import { publishedPress } from '../data/press';
import { STUDIO_BLOG_HOME_H1, STUDIO_BLOG_HOME_SUB } from './blog-copy';
import {
  CONSULTATION_BOOK_INTRO,
  CONSULTATION_CANCEL,
  CONSULTATION_SUCCESS,
  STAGE_B_ADDON,
} from './consultation-buyer';
import { HOME_DOCUMENT_TITLE, HOME_META_DESCRIPTION } from './home-document';

export const STUDIO_ORIGIN = 'https://revealuistudio.com';

const NOT_FOUND_TITLE = '404 | RevealUI Studio';
const NOT_FOUND_DESCRIPTION = 'The page you are looking for does not exist or has moved.';

const QUOTE_TITLE = 'Quote | RevealUI Studio';
const QUOTE_DESCRIPTION =
  'Studio quote. Consultation $300/hr. Pilot $3,997 (includes 1 Adapter). Launch $14,500 (up to 3 Adapters). Adapter $2,497. Care $1,997/mo. Domain add-on $297. Licenses live on revealui.com.';

export interface StudioHead {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly robots: string;
  readonly canonicalHref: string | null;
  readonly ogType: 'website' | 'article';
  readonly feed: boolean;
  readonly jsonLd: boolean;
  /** When false, the build does not emit an HTML file. Redirects and 404s stay off disk. */
  readonly prerender: boolean;
}

interface RouteSpec {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly robots?: string;
  readonly prerender?: boolean;
  readonly feed?: boolean;
  readonly jsonLd?: boolean;
}

function canonicalHrefFor(path: string): string {
  if (path === '/') return `${STUDIO_ORIGIN}/`;
  return `${STUDIO_ORIGIN}${path}`;
}

function specHead(spec: RouteSpec): StudioHead {
  return {
    path: spec.path,
    title: spec.title,
    description: spec.description,
    robots: spec.robots ?? 'index,follow',
    canonicalHref: canonicalHrefFor(spec.path),
    ogType: 'website',
    feed: spec.feed ?? false,
    jsonLd: spec.jsonLd ?? false,
    prerender: spec.prerender ?? true,
  };
}

const ROUTE_SPECS: readonly RouteSpec[] = [
  {
    path: '/',
    title: HOME_DOCUMENT_TITLE,
    description: HOME_META_DESCRIPTION,
    feed: true,
    jsonLd: true,
  },
  {
    path: '/services',
    title: 'Offers | RevealUI Studio',
    description:
      'Consultation $300 per hour when you book the slot. Pilot $3,997 (includes 1 Adapter). Launch $14,500 (up to 3 Adapters). Adapter $2,497. Care $1,997/mo. Domain add-on $297. Pilot and Launch are invoiced after we agree.',
  },
  {
    path: '/process',
    title: 'How we work | RevealUI Studio',
    description:
      'How a RevealUI Studio engagement runs. Consultation $300/hr. Pilot $3,997 (includes 1 Adapter). Launch $14,500 (up to 3 Adapters). Adapter $2,497. Care $1,997/mo. Domain add-on $297. Book a 30-minute intro on Google Calendar.',
  },
  {
    path: '/blog',
    title: `${STUDIO_BLOG_HOME_H1} | RevealUI Studio`,
    description: STUDIO_BLOG_HOME_SUB,
    feed: true,
  },
  {
    path: '/about',
    title: 'About | RevealUI Studio',
    description:
      'RevealUI Studio is for startups, and for technical founders and small agencies who already run agents. Joshua Vaughn runs it. Consultation, Pilot, and Launch. Adapter is an add-on and is not sold alone. Remote first. Consultation is paid when you book the slot.',
  },
  {
    path: '/consultation/book',
    title: 'Book a Consultation | RevealUI Studio',
    description: `${CONSULTATION_BOOK_INTRO} ${STAGE_B_ADDON}`,
  },
  {
    path: '/consultation/book/success',
    title: 'Consultation payment received | RevealUI Studio',
    description: CONSULTATION_SUCCESS,
    robots: 'noindex,nofollow',
  },
  {
    path: '/consultation/book/cancel',
    title: 'Consultation checkout canceled | RevealUI Studio',
    description: CONSULTATION_CANCEL,
    robots: 'noindex,nofollow',
  },
  {
    path: '/contact',
    title: 'Contact | RevealUI Studio',
    description:
      'Book a Consultation or a 30-minute intro, or email founder@revealui.com. No payment to book the intro.',
  },
  {
    path: PROOF_GAP_PATH,
    title: PROOF_GAP_DOCUMENT_TITLE,
    description: PROOF_GAP_META_DESCRIPTION,
  },
  {
    path: '/cookies',
    title: 'Cookies | RevealUI Studio',
    description:
      'How revealuistudio.com uses cookies, performance telemetry, pageview analytics, and error telemetry.',
  },
  {
    path: '/privacy',
    title: 'Privacy | RevealUI Studio',
    description:
      'How RevealUI Studio collects, uses, and protects the information you share with us.',
  },
  {
    path: '/terms',
    title: 'Terms | RevealUI Studio',
    description: 'The terms that govern your use of revealuistudio.com and our engagement process.',
  },
  {
    path: '/cases',
    title: 'Engagements | RevealUI Studio',
    description: 'Published only with explicit customer permission.',
    robots: publishedCases.length === 0 ? 'noindex,nofollow' : 'index,follow',
  },
  {
    path: '/press',
    title: 'Press | RevealUI Studio',
    description: 'Public talks and mentions, when they exist.',
    robots: publishedPress.length === 0 ? 'noindex,nofollow' : 'index,follow',
  },
  {
    path: '/pricing',
    title: QUOTE_TITLE,
    description: QUOTE_DESCRIPTION,
    robots: 'noindex,follow',
    prerender: false,
  },
  {
    path: '/products',
    title: QUOTE_TITLE,
    description: QUOTE_DESCRIPTION,
    robots: 'noindex,follow',
    prerender: false,
  },
  {
    path: '/catalog',
    title: QUOTE_TITLE,
    description: QUOTE_DESCRIPTION,
    robots: 'noindex,follow',
    prerender: false,
  },
];

const SPEC_BY_PATH = new Map(ROUTE_SPECS.map((spec) => [spec.path, spec]));

export function normalizePathname(pathname: string): string {
  const noHash = pathname.split('#')[0] ?? '';
  const noQuery = noHash.split('?')[0] ?? '';
  if (noQuery === '' || noQuery === '/') return '/';
  return noQuery.endsWith('/') ? noQuery.slice(0, -1) : noQuery;
}

function notFoundHead(path: string): StudioHead {
  return {
    path,
    title: NOT_FOUND_TITLE,
    description: NOT_FOUND_DESCRIPTION,
    robots: 'noindex',
    canonicalHref: null,
    ogType: 'website',
    feed: false,
    jsonLd: false,
    prerender: false,
  };
}

function publishedPostForSlug(slug: string): BlogEntry | undefined {
  return BLOG_ENTRIES.find((entry) => {
    if (!entry.published) return false;
    if (entry.slug === slug) return true;
    return docsBlogPath(entry) === `/blog/${slug}`;
  });
}

function blogHead(path: string, slug: string): StudioHead {
  const post = publishedPostForSlug(slug);
  if (!post) return notFoundHead(path);
  const canonicalPath = `/blog/${post.slug}`;
  return {
    path: canonicalPath,
    title: `${post.title} | RevealUI Studio`,
    description: post.excerpt,
    robots: 'index,follow',
    canonicalHref: canonicalHrefFor(canonicalPath),
    ogType: 'article',
    feed: true,
    jsonLd: false,
    prerender: slug === post.slug,
  };
}

function caseHead(path: string, slug: string): StudioHead {
  const study = publishedCases.find((item) => item.slug === slug);
  if (!study) return notFoundHead(path);
  return {
    path,
    title: `${study.headline} | RevealUI Studio`,
    description: study.summary,
    robots: 'index,follow',
    canonicalHref: canonicalHrefFor(path),
    ogType: 'article',
    feed: false,
    jsonLd: false,
    prerender: true,
  };
}

function pressHead(path: string, slug: string): StudioHead {
  const item = publishedPress.find((entry) => entry.slug === slug);
  if (!item) return notFoundHead(path);
  return {
    path,
    title: `${item.title} | RevealUI Studio`,
    description: item.summary,
    robots: 'index,follow',
    canonicalHref: canonicalHrefFor(path),
    ogType: 'article',
    feed: false,
    jsonLd: false,
    prerender: true,
  };
}

function singleSegment(prefix: string, path: string): string | null {
  if (!path.startsWith(prefix)) return null;
  const slug = path.slice(prefix.length);
  if (slug.length === 0 || slug.includes('/')) return null;
  return slug;
}

/** Document head for a pathname. Unknown and unpublished slugs are the 404 document. */
export function headForPathname(pathname: string): StudioHead {
  const path = normalizePathname(pathname);
  const blogSlug = singleSegment('/blog/', path);
  if (blogSlug) return blogHead(path, blogSlug);
  const caseSlug = singleSegment('/cases/', path);
  if (caseSlug) return caseHead(path, caseSlug);
  const pressSlug = singleSegment('/press/', path);
  if (pressSlug) return pressHead(path, pressSlug);
  const spec = SPEC_BY_PATH.get(path);
  if (!spec) return notFoundHead(path);
  return specHead(spec);
}

export function routeMeta(pathname: string): {
  title: string;
  description: string;
  robots: string;
} {
  const head = headForPathname(pathname);
  return {
    title: head.title,
    description: head.description,
    robots: head.robots,
  };
}

/** HTML files the build emits. Redirect-only paths and the 404 document are omitted. */
export function prerenderHeads(): readonly StudioHead[] {
  const heads: StudioHead[] = [];
  const seen = new Set<string>();
  const add = (pathname: string) => {
    const head = headForPathname(pathname);
    if (!head.prerender || head.canonicalHref === null) return;
    if (seen.has(head.canonicalHref)) return;
    seen.add(head.canonicalHref);
    heads.push(head);
  };
  for (const spec of ROUTE_SPECS) add(spec.path);
  for (const entry of BLOG_ENTRIES) {
    if (entry.published) add(`/blog/${entry.slug}`);
  }
  for (const study of publishedCases) add(`/cases/${study.slug}`);
  for (const item of publishedPress) add(`/press/${item.slug}`);
  return heads;
}

/** Output path relative to dist. Home is index.html. Other routes are directory indexes. */
export function htmlRelativePath(routePath: string): string {
  if (routePath === '/') return 'index.html';
  return `${routePath.replace(/^\//, '')}/index.html`;
}
