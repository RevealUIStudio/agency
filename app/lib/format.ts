/**
 * Format an editorial date string (e.g. a PressItem.date) for display.
 *
 * Returns the raw string unchanged when it isn't a parseable date, so an
 * authoring typo surfaces the bad value for correction instead of rendering the
 * literal "Invalid Date" on a public page.
 */
export function formatPressDate(raw: string): string {
  const date = new Date(raw);
  return Number.isNaN(date.getTime())
    ? raw
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
