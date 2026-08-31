import { describe, expect, it } from 'vitest';
import {
  ARCHITECTURE_ARTIFACT_BUNDLE,
  LAUNCH_PACKAGE,
  WORKING_SESSION,
} from '@/lib/engagements';
import { buildQuote, DEFAULT_HOSTER, DEFAULT_OUTCOME, DEFAULT_PLACES } from '@/lib/quote';

describe('buildQuote', () => {
  it('defaults to Studio putting it live', () => {
    expect(DEFAULT_HOSTER).toBe('studio');
    expect(DEFAULT_OUTCOME).toBe('launch');
    expect(DEFAULT_PLACES).toBe('one');
  });

  it('prints the three Studio prices without live-or-holdback on Launch', () => {
    const quote = buildQuote({
      hoster: DEFAULT_HOSTER,
      outcome: DEFAULT_OUTCOME,
      places: DEFAULT_PLACES,
    });
    expect(quote.kind).toBe('studio');
    expect(quote.stopQuoting).toBe(false);
    expect(quote.lines.map((line) => line.price)).toEqual([
      WORKING_SESSION.price,
      ARCHITECTURE_ARTIFACT_BUNDLE.price,
      LAUNCH_PACKAGE.price,
    ]);
    expect(WORKING_SESSION.price).toBe('$300');
    expect(ARCHITECTURE_ARTIFACT_BUNDLE.price).toBe('$3,500');
    expect(LAUNCH_PACKAGE.price).toBe('$7,500');

    const hour = quote.lines.find((line) => line.id === 'working-session');
    const plan = quote.lines.find((line) => line.id === 'architecture-artifact-bundle');
    const launch = quote.lines.find((line) => line.id === 'launch-package');
    expect(hour?.detail).toContain('No holdback');
    expect(plan?.detail).toBe(ARCHITECTURE_ARTIFACT_BUNDLE.payment);
    expect(plan?.detail).toContain('Credits to a launch in 30 days');
    expect(plan?.detail).not.toContain('first half back');
    expect(launch?.highlighted).toBe(true);
    expect(launch?.detail).toBe(LAUNCH_PACKAGE.payment);
    expect(launch?.detail).toBe('Half now, half on delivery.');
    expect(JSON.stringify(quote)).not.toMatch(/four tests/i);
    expect(JSON.stringify(quote)).not.toMatch(/signup-to-paid/i);
    expect(JSON.stringify(quote)).not.toMatch(/first half back/i);
    expect(JSON.stringify(quote)).not.toMatch(/keep the stack/i);
    expect(JSON.stringify(quote)).not.toMatch(/live-or-holdback/i);
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
