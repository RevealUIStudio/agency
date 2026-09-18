import { describe, expect, it } from 'vitest';
import { LAUNCH_PACKAGE, WORKING_SESSION, WRITTEN_PLAN } from '@/lib/engagements';
import {
  buildQuote,
  CONSULTATION_QUOTE_DETAIL,
  DEFAULT_HOSTER,
  DEFAULT_OUTCOME,
  DEFAULT_PLACES,
  INTRO_BODY,
  INTRO_HEADING,
  LAUNCH_QUOTE_DETAIL,
  PILOT_QUOTE_DETAIL,
  SELF_HOST_HANDOFF,
  STUDIO_QUOTE_BODY,
} from '@/lib/quote';

describe('buildQuote', () => {
  it('defaults to Studio putting a Pilot live', () => {
    expect(DEFAULT_HOSTER).toBe('studio');
    expect(DEFAULT_OUTCOME).toBe('plan');
    expect(DEFAULT_PLACES).toBe('one');
  });

  it('prints the three Studio prices and leads the result card with result + PROOF', () => {
    const quote = buildQuote({
      hoster: DEFAULT_HOSTER,
      outcome: DEFAULT_OUTCOME,
      places: DEFAULT_PLACES,
    });
    expect(quote.kind).toBe('studio');
    expect(quote.body).toBe(STUDIO_QUOTE_BODY);
    expect(quote.body).toMatch(/You run it, or we implement with you/);
    expect(quote.body).not.toMatch(/You run it, or I ship it with you/);
    expect(quote.body).not.toMatch(/They operate, or they pay to implement/);
    expect(quote.stopQuoting).toBe(false);
    expect(quote.lines.map((line) => line.price)).toEqual([
      WORKING_SESSION.price,
      WRITTEN_PLAN.price,
      LAUNCH_PACKAGE.price,
    ]);
    expect(WORKING_SESSION.price).toBe('$300');
    expect(WRITTEN_PLAN.price).toBe('$1,500');
    expect(LAUNCH_PACKAGE.price).toBe('$7,500');
    expect(quote.lines.map((line) => line.title)).toEqual(['Consultation', 'Pilot', 'Launch']);

    const hour = quote.lines.find((line) => line.id === 'working-session');
    const plan = quote.lines.find((line) => line.id === 'written-plan');
    const launch = quote.lines.find((line) => line.id === 'launch-package');
    expect(hour?.detail).toBe(CONSULTATION_QUOTE_DETAIL);
    expect(hour?.detail).toContain('proof gaps');
    expect(hour?.detail).toContain('Invoice $300 before we start');
    expect(hour?.detail).toContain('No holdback');
    expect(hour?.detail).toContain('No leftover site');
    expect(plan?.highlighted).toBe(true);
    expect(plan?.detail).toBe(PILOT_QUOTE_DETAIL);
    expect(plan?.detail).toMatch(/^One site on your domain/);
    expect(plan?.detail).toContain('One receipted action (PROOF)');
    expect(plan?.detail).toContain('Invoice $1,500 before we start');
    expect(plan?.detail).toContain('Credits 100% to Launch');
    expect(plan?.detail).toContain('30 days');
    expect(plan?.detail).not.toContain('first half back');
    expect(launch?.highlighted).toBe(false);
    expect(launch?.detail).toBe(LAUNCH_QUOTE_DETAIL);
    expect(launch?.detail).toMatch(/^One live money path on your accounts/);
    expect(launch?.detail).toContain('Half now, half on delivery.');
    expect(JSON.stringify(quote)).not.toMatch(/four tests/i);
    expect(JSON.stringify(quote)).not.toMatch(/signup-to-paid/i);
    expect(JSON.stringify(quote)).not.toMatch(/first half back/i);
    expect(JSON.stringify(quote)).not.toMatch(/keep the stack/i);
    expect(JSON.stringify(quote)).not.toMatch(/live-or-holdback/i);
    expect(JSON.stringify(quote)).not.toMatch(/outcome validation/i);
    expect(JSON.stringify(quote)).not.toMatch(/proof of work/i);
  });

  it('sends self-host visitors to the product site without quoting product SKUs', () => {
    const quote = buildQuote({
      hoster: 'self-host',
      outcome: 'launch',
      places: 'one',
    });
    expect(quote.kind).toBe('self-host');
    expect(quote.heading).toBe(SELF_HOST_HANDOFF);
    expect(quote.lines).toEqual([]);
    expect(quote.productHandoffUrl).toBe('https://revealui.com');
    expect(JSON.stringify(quote)).not.toMatch(/\$49/);
    expect(JSON.stringify(quote)).not.toMatch(/\$99/);
    expect(JSON.stringify(quote)).not.toMatch(/\$299/);
    expect(JSON.stringify(quote)).not.toMatch(/Enterprise/);
  });

  it('stops quoting when there is more than one site', () => {
    const quote = buildQuote({
      hoster: 'studio',
      outcome: 'launch',
      places: 'many',
    });
    expect(quote.kind).toBe('intro');
    expect(quote.stopQuoting).toBe(true);
    expect(quote.lines).toEqual([]);
    expect(quote.heading).toBe(INTRO_HEADING);
    expect(quote.body).toBe(INTRO_BODY);
  });
});
