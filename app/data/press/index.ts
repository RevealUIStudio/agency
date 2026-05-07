import type { PressItem } from './types';

export type { PressItem };

export const allPress: readonly PressItem[] = [];

export const publishedPress: readonly PressItem[] = allPress.filter((p) => p.published);

export function findPressBySlug(slug: string): PressItem | undefined {
  return allPress.find((p) => p.slug === slug);
}
