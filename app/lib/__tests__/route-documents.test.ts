import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  headForPathname,
  htmlRelativePath,
  prerenderHeads,
  STUDIO_ORIGIN,
} from '@/lib/route-documents';
import { applyRouteHead, sitemapLocs } from '@/lib/route-html';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

type Redirect = {
  source: string;
  destination: string;
  permanent?: boolean;
  statusCode?: number;
};
type Rewrite = {
  source: string;
  destination: string;
  has?: { type: string; value: string }[];
};
type HostConfig = {
  trailingSlash?: boolean;
  redirects: Redirect[];
  rewrites: Rewrite[];
};

function hostConfig(): HostConfig {
  return JSON.parse(readFileSync(path.join(repoRoot, 'vercel.json'), 'utf8')) as HostConfig;
}

function attr(html: string, pattern: RegExp): string | null {
  const raw = html.match(pattern)?.[1] ?? null;
  if (raw === null) return null;
  return raw.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&amp;', '&');
}

describe('route documents', () => {
  const shell = readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const locs = sitemapLocs(readFileSync(path.join(repoRoot, 'public/sitemap.xml'), 'utf8'));

  it('sets canonical, og:url, and twitter:url to the sitemap URL for every loc', () => {
    expect(locs.length).toBeGreaterThan(0);
    const homeTitle = headForPathname('/').title;
    for (const loc of locs) {
      const routePath = new URL(loc).pathname;
      const head = headForPathname(routePath);
      expect(head.canonicalHref, loc).toBe(loc);
      expect(head.prerender, loc).toBe(true);
      const html = applyRouteHead(shell, head);
      expect(attr(html, /<link rel="canonical" href="([^"]*)"/), loc).toBe(loc);
      expect(attr(html, /<meta property="og:url" content="([^"]*)"/), loc).toBe(loc);
      expect(attr(html, /<meta name="twitter:url" content="([^"]*)"/), loc).toBe(loc);
      expect(attr(html, /<title>([^<]*)<\/title>/), loc).toBe(head.title);
      expect(attr(html, /<meta property="og:title" content="([^"]*)"/), loc).toBe(head.title);
      expect(attr(html, /<meta name="twitter:title" content="([^"]*)"/), loc).toBe(head.title);
      expect(attr(html, /<meta name="description" content="([^"]*)"/), loc).toBe(head.description);
      expect(attr(html, /<meta property="og:description" content="([^"]*)"/), loc).toBe(
        head.description,
      );
      expect(attr(html, /<meta name="twitter:description" content="([^"]*)"/), loc).toBe(
        head.description,
      );
      if (routePath !== '/') {
        expect(head.title, loc).not.toBe(homeTitle);
        expect(html.includes('"@type": "ProfessionalService"'), loc).toBe(false);
      } else {
        expect(html).toContain('"@type": "ProfessionalService"');
        expect(loc).toBe(`${STUDIO_ORIGIN}/`);
      }
    }
  });

  it('writes a noindex 404 document with no homepage canonical', () => {
    const head = headForPathname('/does-not-exist-audit-404');
    expect(head.robots).toBe('noindex');
    expect(head.canonicalHref).toBeNull();
    expect(head.prerender).toBe(false);
    const html = applyRouteHead(shell, head);
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('property="og:url"');
    expect(html).not.toContain('name="twitter:url"');
    expect(html).toContain('name="robots" content="noindex"');
    expect(html).toContain('<title>404 | RevealUI Studio</title>');
    expect(html).not.toContain(headForPathname('/').title);
    expect(html).not.toContain('"@type": "ProfessionalService"');
  });

  it('404s a bad blog slug and canonicalizes a published essay to its sitemap URL', () => {
    const missing = headForPathname('/blog/does-not-exist');
    expect(missing.canonicalHref).toBeNull();
    expect(missing.robots).toBe('noindex');
    expect(missing.prerender).toBe(false);

    const post = headForPathname('/blog/claim-drift');
    expect(post.canonicalHref).toBe(`${STUDIO_ORIGIN}/blog/claim-drift`);
    expect(post.ogType).toBe('article');
    expect(post.prerender).toBe(true);

    const alias = headForPathname('/blog/14-claim-drift');
    expect(alias.canonicalHref).toBe(`${STUDIO_ORIGIN}/blog/claim-drift`);
    expect(alias.prerender).toBe(false);
  });

  it('treats uppercase paths as unknown so the host can 404 them', () => {
    expect(headForPathname('/PRICING').robots).toBe('noindex');
    expect(headForPathname('/PRICING').canonicalHref).toBeNull();
    expect(headForPathname('/Services').canonicalHref).toBeNull();
    expect(prerenderHeads().some((head) => head.path === '/PRICING')).toBe(false);
  });

  it('places prerendered routes on directory indexes and keeps redirect paths off disk', () => {
    expect(htmlRelativePath('/')).toBe('index.html');
    expect(htmlRelativePath('/consultation/book')).toBe('consultation/book/index.html');
    expect(htmlRelativePath('/blog/claim-drift')).toBe('blog/claim-drift/index.html');
    const paths = prerenderHeads().map((head) => head.path);
    expect(paths).toContain('/services');
    expect(paths).toContain('/privacy');
    expect(paths).toContain('/blog/open-runtime-for-fde-work');
    expect(paths).not.toContain('/pricing');
    expect(paths).not.toContain('/products');
    expect(paths).not.toContain('/catalog');
  });

  it('covers trailing-slash variants of the calculator redirects', () => {
    const vercel = hostConfig();
    expect(vercel.trailingSlash).toBe(false);
    for (const source of [
      '/pricing',
      '/pricing/',
      '/products',
      '/products/',
      '/catalog',
      '/catalog/',
    ]) {
      expect(vercel.redirects).toContainEqual({
        source,
        destination: '/#calculator',
        permanent: true,
      });
    }
    expect(vercel.redirects).toContainEqual({
      source: '/index.html',
      destination: '/',
      permanent: true,
    });
    expect(
      vercel.rewrites.some(
        (rule) => rule.source === '/(.*)' && rule.destination === '/index.html' && !rule.has,
      ),
    ).toBe(false);
    expect(vercel.rewrites).toContainEqual({
      source: '/(.*)',
      destination: '/index.html',
      has: [{ type: 'host', value: '.+\\.revealuistudio\\.com' }],
    });
  });
});
