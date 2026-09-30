import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { allBlogPosts, publishedBlogPosts, STUDIO_SITE_ORIGIN } from '@/data/blog';
import { findBannedToolNames } from '@/lib/buyer-facing-names';
import { docsBlogPath, studioBlogPath } from '../../../../content/blog/registry';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

function publishedBody(file: string): string {
  return readFileSync(path.join(repoRoot, 'content/blog', file), 'utf8').replaceAll(
    'github.com',
    '',
  );
}

describe('studio blog registry', () => {
  it('loads every moved essay and holds vendor-heavy posts off the index', () => {
    expect(allBlogPosts).toHaveLength(18);
    expect(publishedBlogPosts.length).toBeGreaterThan(0);
    for (const post of allBlogPosts) {
      expect(post.content.startsWith('---\n')).toBe(true);
      if (!post.published) {
        expect(post.todo).toContain(`RevealUIStudio/revealui docs/blog/${post.file}`);
        expect(studioBlogPath(post)).toBe('/blog');
      } else {
        expect(post.todo).toBeUndefined();
        expect(studioBlogPath(post)).toBe(`/blog/${post.slug}`);
      }
      expect(docsBlogPath(post)).toBe(`/blog/${post.docsSlug}`);
    }
    expect(publishedBlogPosts.map((post) => post.slug)).toContain('open-runtime-for-fde-work');
    expect(publishedBlogPosts.map((post) => post.slug)).not.toContain('why-we-built-revealui');
  });

  it('keeps published essays on house style', () => {
    const published = allBlogPosts.filter((post) => post.published);
    for (const post of published) {
      const body = publishedBody(post.file);
      expect(body).not.toContain('\u2014');
      expect(body).not.toContain('Proof Sprint');
      expect(body.toLowerCase()).not.toContain('ten years');
      expect(findBannedToolNames(body), post.file).toEqual([]);
    }
    const upside = publishedBody('17-shareable-upside.md');
    const future = publishedBody('16-ui-of-the-future.md');
    const runtime = publishedBody('18-open-runtime-for-fde-work.md');
    expect(upside).toContain('5+ years');
    expect(future).toContain('5+ years');
    expect(runtime).toContain('Consultation, Pilot, and Launch');
  });

  it('maps numbered docs paths to Studio paths in vercel.json and the sitemap', () => {
    const vercel = JSON.parse(readFileSync(path.join(repoRoot, 'vercel.json'), 'utf8')) as {
      redirects: { source: string; destination: string; permanent: boolean }[];
    };
    const sitemap = readFileSync(path.join(repoRoot, 'public/sitemap.xml'), 'utf8');
    expect(sitemap).toContain(`${STUDIO_SITE_ORIGIN}/blog`);
    for (const post of allBlogPosts) {
      const rule = vercel.redirects.find((entry) => entry.source === docsBlogPath(post));
      expect(rule?.destination).toBe(studioBlogPath(post));
      expect(rule?.permanent).toBe(true);
      if (post.published) {
        expect(sitemap).toContain(`${STUDIO_SITE_ORIGIN}/blog/${post.slug}`);
      } else {
        expect(sitemap).not.toContain(`${STUDIO_SITE_ORIGIN}/blog/${post.slug}`);
      }
    }
  });
});
