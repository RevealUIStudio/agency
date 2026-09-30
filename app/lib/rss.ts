import { BLOG_ENTRIES, type BlogEntry } from '../../content/blog/registry';
import {
  STUDIO_BLOG_FEED_PATH,
  STUDIO_BLOG_FEED_TITLE,
  STUDIO_BLOG_FEED_TYPE,
  STUDIO_BLOG_HOME_SUB,
} from './blog-copy';

/** Public Studio origin. Item links and the channel self link use this host only. */
export const STUDIO_ORIGIN = 'https://revealuistudio.com';

export const RSS_CONTENT_TYPE = `${STUDIO_BLOG_FEED_TYPE}; charset=utf-8`;

export const RSS_SELF_URL = `${STUDIO_ORIGIN}${STUDIO_BLOG_FEED_PATH}`;

export const RSS_CHANNEL_LINK = `${STUDIO_ORIGIN}/blog`;

export const RSS_CHANNEL_TITLE = STUDIO_BLOG_FEED_TITLE;

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/** Published essays, newest first, matching the blog index order. */
export function publishedFeedEntries(
  entries: readonly BlogEntry[] = BLOG_ENTRIES,
): readonly BlogEntry[] {
  return entries
    .filter((entry) => entry.published)
    .slice()
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0));
}

/** RFC 822 date-time, the form RSS 2.0 requires for pubDate. */
export function formatRfc822(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid publication date: ${iso}`);
  }
  return date.toUTCString();
}

function itemXml(entry: BlogEntry): string {
  const link = `${STUDIO_ORIGIN}/blog/${entry.slug}`;
  return [
    '    <item>',
    `      <title>${escapeXml(entry.title)}</title>`,
    `      <link>${escapeXml(link)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
    `      <pubDate>${formatRfc822(entry.publishedAt)}</pubDate>`,
    `      <description>${escapeXml(entry.excerpt)}</description>`,
    '    </item>',
  ].join('\n');
}

/** RSS 2.0 document for the published Studio blog. No campaign params. */
export function renderStudioRss(entries: readonly BlogEntry[] = publishedFeedEntries()): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(RSS_CHANNEL_TITLE)}</title>`,
    `    <link>${escapeXml(RSS_CHANNEL_LINK)}</link>`,
    `    <description>${escapeXml(STUDIO_BLOG_HOME_SUB)}</description>`,
    '    <language>en-us</language>',
    `    <atom:link href="${escapeXml(RSS_SELF_URL)}" rel="self" type="${STUDIO_BLOG_FEED_TYPE}"/>`,
    ...entries.map((entry) => itemXml(entry)),
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}
