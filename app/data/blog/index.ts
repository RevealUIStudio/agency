import {
  BLOG_ENTRIES,
  type BlogEntry,
  docsBlogPath,
  studioBlogPath,
} from '../../../content/blog/registry';

export type { BlogEntry };
export { docsBlogPath, studioBlogPath };

export interface BlogPost extends BlogEntry {
  readonly docsSlug: string;
  readonly content: string;
}

const markdownFiles = import.meta.glob('../../../content/blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function loadContent(filename: string): string {
  for (const [key, value] of Object.entries(markdownFiles)) {
    if (key.endsWith(`/${filename}`)) return value;
  }
  return '';
}

function docsSlug(file: string): string {
  return file.endsWith('.md') ? file.slice(0, -3) : file;
}

export const allBlogPosts: readonly BlogPost[] = BLOG_ENTRIES.map((entry) => ({
  ...entry,
  docsSlug: docsSlug(entry.file),
  content: loadContent(entry.file),
}));

for (const post of allBlogPosts) {
  if (post.published && post.content.length === 0) {
    throw new Error(`Missing published blog file ${post.file}`);
  }
}

export const publishedBlogPosts: readonly BlogPost[] = allBlogPosts
  .filter((post) => post.published)
  .slice()
  .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0));

export function findPublishedBlogPost(slug: string): BlogPost | undefined {
  return publishedBlogPosts.find((post) => post.slug === slug || post.docsSlug === slug);
}

export const STUDIO_SITE_ORIGIN = 'https://revealuistudio.com';

export function blogPostUrl(slug: string): string {
  return `${STUDIO_SITE_ORIGIN}/blog/${slug}`;
}

/** Calendar date in the studio zone, so a UTC timestamp does not shift the day. */
export function formatBlogDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  });
}
