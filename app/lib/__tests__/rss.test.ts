import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { allBlogPosts, type BlogEntry, publishedBlogPosts, STUDIO_SITE_ORIGIN } from '@/data/blog';
import { STUDIO_BLOG_FEED_ALTERNATE_TAG, STUDIO_BLOG_HOME_SUB } from '@/lib/blog-copy';
import { findBannedToolNames } from '@/lib/buyer-facing-names';
import { formatRfc822, RSS_CONTENT_TYPE, renderStudioRss } from '@/lib/rss';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

type Header = { key: string; value: string };
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
  headers: { source: string; headers: Header[] }[];
  redirects: Redirect[];
  rewrites: Rewrite[];
};

function directChild(parent: Element, name: string): Element | undefined {
  return [...parent.children].find(
    (node) => node.localName === name && node.namespaceURI !== 'http://www.w3.org/2005/Atom',
  );
}

function hostConfig(): HostConfig {
  return JSON.parse(readFileSync(path.join(repoRoot, 'vercel.json'), 'utf8')) as HostConfig;
}

describe('studio blog rss', () => {
  const xml = renderStudioRss();

  it('starts with an xml declaration and parses as RSS 2.0', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(doc.documentElement.nodeName).toBe('rss');
    expect(doc.documentElement.getAttribute('version')).toBe('2.0');
    const channel = doc.getElementsByTagName('channel')[0];
    expect(channel).toBeTruthy();
    if (!channel) return;
    expect(directChild(channel, 'title')?.textContent).toBe('RevealUI Studio Blog');
    expect(directChild(channel, 'link')?.textContent).toBe(`${STUDIO_SITE_ORIGIN}/blog`);
    expect(directChild(channel, 'description')?.textContent).toBe(STUDIO_BLOG_HOME_SUB);
    expect(directChild(channel, 'language')?.textContent).toBe('en-us');
    const self = [...channel.children].find(
      (node) => node.localName === 'link' && node.namespaceURI === 'http://www.w3.org/2005/Atom',
    );
    expect(self?.getAttribute('rel')).toBe('self');
    expect(self?.getAttribute('href')).toBe(`${STUDIO_SITE_ORIGIN}/rss.xml`);
    expect(self?.getAttribute('type')).toBe('application/rss+xml');
  });

  it('lists one item per published essay and skips held essays', () => {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const items = [...doc.getElementsByTagName('item')];
    expect(publishedBlogPosts.length).toBeGreaterThan(0);
    expect(items).toHaveLength(publishedBlogPosts.length);
    items.forEach((item, index) => {
      const post = publishedBlogPosts[index];
      expect(post).toBeTruthy();
      if (!post) return;
      const link = `${STUDIO_SITE_ORIGIN}/blog/${post.slug}`;
      expect(directChild(item, 'title')?.textContent).toBe(post.title);
      expect(directChild(item, 'link')?.textContent).toBe(link);
      expect(directChild(item, 'description')?.textContent).toBe(post.excerpt);
      expect(directChild(item, 'pubDate')?.textContent).toBe(formatRfc822(post.publishedAt));
      expect(directChild(item, 'pubDate')?.textContent).toBe(
        new Date(post.publishedAt).toUTCString(),
      );
      const guid = directChild(item, 'guid');
      expect(guid?.textContent).toBe(link);
      expect(guid?.getAttribute('isPermaLink')).toBe('true');
      expect(link).not.toMatch(/[?&]utm_/i);
    });
    for (const post of allBlogPosts) {
      const url = `${STUDIO_SITE_ORIGIN}/blog/${post.slug}`;
      if (post.published) expect(xml).toContain(url);
      else expect(xml).not.toContain(url);
    }
  });

  it('keeps the feed free of campaign params, em dashes, vendor names, and authors', () => {
    expect(xml).not.toMatch(/[?&]utm_/i);
    expect(xml).not.toMatch(/\u2014|&mdash;|&#8212;|&#x2014;/i);
    expect(xml).not.toContain('docs.revealui.com');
    expect(xml).not.toMatch(/acct_[A-Za-z0-9]{8,}/);
    expect(xml).not.toMatch(/prod_[A-Za-z0-9]{8,}/);
    expect(xml).not.toMatch(/price_[A-Za-z0-9]+/);
    expect(xml).not.toMatch(/sk_(live|test)_/);
    expect(xml).not.toMatch(/whsec_/);
    expect(findBannedToolNames(xml)).toEqual([]);
    for (const post of allBlogPosts) {
      expect(xml).not.toContain(post.author);
    }
  });

  it('escapes item text and omits the author field', () => {
    const sample: BlogEntry = {
      slug: 'ampersand-sample',
      title: 'Tools & receipts',
      excerpt: 'A <tag> and "quote"',
      publishedAt: '2026-01-02T03:04:05.000Z',
      author: 'Skip Author',
      file: 'sample.md',
      published: true,
    };
    const sampleXml = renderStudioRss([sample]);
    expect(sampleXml).toContain('Tools &amp; receipts');
    expect(sampleXml).toContain('A &lt;tag&gt; and &quot;quote&quot;');
    expect(sampleXml).not.toContain('<tag>');
    expect(sampleXml).not.toContain('Skip Author');
    expect(sampleXml).toContain('<pubDate>Fri, 02 Jan 2026 03:04:05 GMT</pubDate>');
  });

  it('advertises the feed from the blog document shell', () => {
    const html = readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
    expect(html).toContain(STUDIO_BLOG_FEED_ALTERNATE_TAG);
    expect(STUDIO_BLOG_FEED_ALTERNATE_TAG).toBe(
      '<link rel="alternate" type="application/rss+xml" title="RevealUI Studio Blog" href="/rss.xml">',
    );
  });

  it('pins /rss.xml and /feed.xml ahead of the SPA fallback', () => {
    const vercel = hostConfig();
    const rssHeader = vercel.headers.find((rule) => rule.source === '/rss.xml');
    expect(rssHeader?.headers).toContainEqual({
      key: 'Content-Type',
      value: RSS_CONTENT_TYPE,
    });
    expect(RSS_CONTENT_TYPE).toBe('application/rss+xml; charset=utf-8');

    expect(vercel.redirects.find((rule) => rule.source === '/feed.xml')).toEqual({
      source: '/feed.xml',
      destination: '/rss.xml',
      statusCode: 301,
    });
    expect(vercel.rewrites.some((rule) => rule.source === '/feed.xml')).toBe(false);

    const rssRewrite = vercel.rewrites.findIndex((rule) => rule.source === '/rss.xml');
    const spaFallback = vercel.rewrites.findIndex(
      (rule) => rule.source === '/(.*)' && rule.destination === '/index.html',
    );
    expect(vercel.rewrites[rssRewrite]).toEqual({
      source: '/rss.xml',
      destination: '/rss.xml',
    });
    expect(rssRewrite).toBeGreaterThanOrEqual(0);
    expect(spaFallback).toBeGreaterThan(rssRewrite);
    expect(vercel.rewrites[spaFallback]).toEqual({
      source: '/(.*)',
      destination: '/index.html',
      has: [{ type: 'host', value: '.+\\.revealuistudio\\.com' }],
    });
    expect(vercel.rewrites.at(-1)?.source).toBe('/(.*)');
    expect(
      vercel.rewrites.some(
        (rule) => rule.source === '/(.*)' && rule.destination === '/index.html' && !rule.has,
      ),
    ).toBe(false);

    for (const source of ['/', '/blog', '/services', '/about', '/contact', '/process']) {
      expect(vercel.rewrites.find((rule) => rule.source === source)).toBeUndefined();
    }
    expect(vercel.redirects.find((rule) => rule.source === '/blog')).toBeUndefined();

    const app = readFileSync(path.join(repoRoot, 'app/App.tsx'), 'utf8');
    expect(app).toContain("path: '/blog'");
    expect(app).toContain('component: BlogPage');
    expect(app).toContain("path: '/blog/:slug'");
    expect(app).toContain('component: BlogPostPage');

    const viteConfig = readFileSync(path.join(repoRoot, 'vite.config.ts'), 'utf8');
    expect(viteConfig).toContain("name: 'studio-rss-feed'");
    expect(viteConfig).toContain("path.join(options.dir, 'rss.xml')");
  });
});
