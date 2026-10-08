/**
 * Stamps a Vite HTML shell with one route's head tags.
 * The body stays the client bundle. Scrapers read the head without running it.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  headForPathname,
  htmlRelativePath,
  prerenderHeads,
  type StudioHead,
} from './route-documents';

export function escapeHtmlText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
}

export function escapeHtmlAttr(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

function replacePattern(html: string, pattern: RegExp, replacement: string, label: string): string {
  if (!pattern.test(html)) {
    throw new Error(`Route HTML is missing ${label}`);
  }
  return html.replace(pattern, () => replacement);
}

function replaceCaptured(html: string, pattern: RegExp, value: string, label: string): string {
  if (!pattern.test(html)) {
    throw new Error(`Route HTML is missing ${label}`);
  }
  const escaped = escapeHtmlAttr(value);
  return html.replace(
    pattern,
    (_match, prefix: string, suffix: string) => `${prefix}${escaped}${suffix}`,
  );
}

function removeLine(html: string, pattern: RegExp): string {
  return html.replace(pattern, '');
}

/** Apply one route's head to the built shell. Does not change the client bundle script. */
export function applyRouteHead(html: string, head: StudioHead): string {
  let next = replacePattern(
    html,
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtmlText(head.title)}</title>`,
    'title',
  );
  next = replaceCaptured(
    next,
    /(<meta name="description" content=")[^"]*(")/,
    head.description,
    'meta description',
  );
  next = replaceCaptured(
    next,
    /(<meta name="robots" content=")[^"]*(")/,
    head.robots,
    'meta robots',
  );
  next = replaceCaptured(
    next,
    /(<meta property="og:type" content=")[^"]*(")/,
    head.ogType,
    'og:type',
  );
  next = replaceCaptured(
    next,
    /(<meta property="og:title" content=")[^"]*(")/,
    head.title,
    'og:title',
  );
  next = replaceCaptured(
    next,
    /(<meta property="og:description" content=")[^"]*(")/,
    head.description,
    'og:description',
  );
  next = replaceCaptured(
    next,
    /(<meta property="og:image:alt" content=")[^"]*(")/,
    head.title,
    'og:image:alt',
  );
  next = replaceCaptured(
    next,
    /(<meta name="twitter:title" content=")[^"]*(")/,
    head.title,
    'twitter:title',
  );
  next = replaceCaptured(
    next,
    /(<meta name="twitter:description" content=")[^"]*(")/,
    head.description,
    'twitter:description',
  );

  if (head.canonicalHref) {
    next = replaceCaptured(
      next,
      /(<link rel="canonical" href=")[^"]*(")/,
      head.canonicalHref,
      'canonical',
    );
    next = replaceCaptured(
      next,
      /(<meta property="og:url" content=")[^"]*(")/,
      head.canonicalHref,
      'og:url',
    );
    next = replaceCaptured(
      next,
      /(<meta name="twitter:url" content=")[^"]*(")/,
      head.canonicalHref,
      'twitter:url',
    );
  } else {
    next = removeLine(next, /^[ \t]*<link rel="canonical" href="[^"]*"\s*\/>\r?\n?/m);
    next = removeLine(next, /^[ \t]*<meta property="og:url" content="[^"]*"\s*\/>\r?\n?/m);
    next = removeLine(next, /^[ \t]*<meta name="twitter:url" content="[^"]*"\s*\/>\r?\n?/m);
  }

  if (!head.jsonLd) {
    next = removeLine(
      next,
      /^[ \t]*<script type="application\/ld\+json">[\s\S]*?<\/script>\r?\n?/m,
    );
  }
  if (!head.feed) {
    next = removeLine(
      next,
      /^[ \t]*<link rel="alternate" type="application\/rss\+xml"[^>]*>\r?\n?/m,
    );
  }
  return next;
}

export function sitemapLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1]?.trim() ?? '')
    .filter((loc) => loc.length > 0);
}

function readAttr(html: string, pattern: RegExp): string | null {
  return html.match(pattern)?.[1] ?? null;
}

/** Fail the build when a sitemap URL would ship the homepage canonical. */
export function assertSitemapCanonicals(outDir: string): void {
  const xml = readFileSync(path.join(outDir, 'sitemap.xml'), 'utf8');
  const locs = sitemapLocs(xml);
  if (locs.length === 0) {
    throw new Error('sitemap.xml has no loc entries');
  }
  const homeTitle = headForPathname('/').title;
  for (const loc of locs) {
    const routePath = new URL(loc).pathname;
    const html = readFileSync(path.join(outDir, htmlRelativePath(routePath)), 'utf8');
    const canonical = readAttr(html, /<link rel="canonical" href="([^"]*)"/);
    const ogUrl = readAttr(html, /<meta property="og:url" content="([^"]*)"/);
    const twitterUrl = readAttr(html, /<meta name="twitter:url" content="([^"]*)"/);
    if (canonical !== loc || ogUrl !== loc || twitterUrl !== loc) {
      throw new Error(
        `Head URL for ${loc} is canonical=${canonical ?? 'missing'} og:url=${ogUrl ?? 'missing'} twitter:url=${twitterUrl ?? 'missing'}`,
      );
    }
    const title = readAttr(html, /<title>([^<]*)<\/title>/);
    const ogTitle = readAttr(html, /<meta property="og:title" content="([^"]*)"/);
    const twitterTitle = readAttr(html, /<meta name="twitter:title" content="([^"]*)"/);
    if (!title || title !== ogTitle || title !== twitterTitle) {
      throw new Error(`Title tags differ for ${loc}`);
    }
    if (routePath !== '/' && title === homeTitle) {
      throw new Error(`${loc} still uses the homepage title`);
    }
  }

  const notFound = readFileSync(path.join(outDir, '404.html'), 'utf8');
  if (notFound.includes('rel="canonical"')) {
    throw new Error('404.html must not include a canonical');
  }
  if (notFound.includes('property="og:url"') || notFound.includes('name="twitter:url"')) {
    throw new Error('404.html must not point social URLs at the homepage');
  }
  if (!notFound.includes('name="robots" content="noindex"')) {
    throw new Error('404.html must be noindex');
  }
}

export function writeStudioRouteHtml(outDir: string): void {
  const shell = readFileSync(path.join(outDir, 'index.html'), 'utf8');
  for (const head of prerenderHeads()) {
    if (!head.canonicalHref) continue;
    const destination = path.join(outDir, htmlRelativePath(head.path));
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, applyRouteHead(shell, head), 'utf8');
  }
  const notFound = headForPathname('/__not-found__');
  writeFileSync(path.join(outDir, '404.html'), applyRouteHead(shell, notFound), 'utf8');
  assertSitemapCanonicals(outDir);
}
