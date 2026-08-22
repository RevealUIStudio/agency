import { describe, expect, it } from 'vitest';
import { LAUNCH_PACKAGE, WORKING_SESSION, WRITTEN_PLAN } from '@/lib/engagements';
import {
  buildQuote,
  DEFAULT_HOSTER,
  DEFAULT_OUTCOME,
  DEFAULT_PLACES,
  LAUNCH_HOLDBACK,
} from '@/lib/quote';

describe('buildQuote', () => {
  it('defaults to Studio putting it live', () => {
    expect(DEFAULT_HOSTER).toBe('studio');
    expect(DEFAULT_OUTCOME).toBe('launch');
    expect(DEFAULT_PLACES).toBe('one');
  });

  it('prints the three Studio prices with live-or-holdback only on Launch', () => {
    const quote = buildQuote({
      hoster: DEFAULT_HOSTER,
      outcome: DEFAULT_OUTCOME,
      places: DEFAULT_PLACES,
    });
    expect(quote.kind).toBe('studio');
    expect(quote.stopQuoting).toBe(false);
    expect(quote.lines.map((line) => line.price)).toEqual([
      WORKING_SESSION.price,
      WRITTEN_PLAN.price,
      LAUNCH_PACKAGE.price,
    ]);
    expect(WORKING_SESSION.price).toBe('$300');
    expect(WRITTEN_PLAN.price).toBe('$3,500');
    expect(LAUNCH_PACKAGE.price).toBe('$7,500');

    const hour = quote.lines.find((line) => line.id === 'working-session');
    const plan = quote.lines.find((line) => line.id === 'written-plan');
    const launch = quote.lines.find((line) => line.id === 'launch-package');
    expect(hour?.holdback).toBe(false);
    expect(hour?.detail).toContain('No holdback');
    expect(plan?.holdback).toBe(false);
    expect(plan?.detail).not.toContain('first half back');
    expect(launch?.holdback).toBe(true);
    expect(launch?.highlighted).toBe(true);
    expect(launch?.detail).toBe(LAUNCH_HOLDBACK);
  });

  it('sends self-host visitors to the product site without quoting product SKUs', () => {
    const quote = buildQuote({
      hoster: 'self-host',
      outcome: 'launch',
      places: 'one',
    });
    expect(quote.kind).toBe('self-host');
    expect(quote.lines).toEqual([]);
    expect(quote.productHandoffUrl).toBe('https://revealui.com');
    expect(JSON.stringify(quote)).not.toMatch(/\$49/);
    expect(JSON.stringify(quote)).not.toMatch(/\$299/);
    expect(JSON.stringify(quote)).not.toMatch(/Enterprise/);
  });

  it('stops quoting when there is more than one place', () => {
    const quote = buildQuote({
      hoster: 'studio',
      outcome: 'launch',
      places: 'many',
    });
    expect(quote.kind).toBe('intro');
    expect(quote.stopQuoting).toBe(true);
    expect(quote.lines).toEqual([]);
    expect(quote.heading).toMatch(/Book an intro/);
  });
});
