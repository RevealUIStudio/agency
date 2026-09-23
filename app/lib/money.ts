/** Whole dollars from integer cents. Prices in this repo have no fractional part. */
export function formatUsdFromCents(cents: number): string {
  const dollars = Math.round(cents / 100);
  return `$${dollars.toLocaleString('en-US')}`;
}
