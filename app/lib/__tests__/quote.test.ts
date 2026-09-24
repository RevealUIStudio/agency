import { describe, expect, it } from 'vitest';
import { CONSULTATION, LAUNCH, PROOF_SPRINT } from '@/lib/engagements';
import {
  buildQuote,
  CONSULTATION_QUOTE_DETAIL,
  DEFAULT_HOSTER,
  DEFAULT_OUTCOME,
  DEFAULT_PLACES,
  INTRO_BODY,
  INTRO_HEADING,
  LAUNCH_QUOTE_DETAIL,
  PROOF_QUOTE_DETAIL,
  SELF_HOST_HANDOFF,
  STUDIO_QUOTE_BODY,
} from '@/lib/quote';

describe('buildQuote', () => {
  it('defaults to Studio putting a Proof Sprint live', () => {
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
      CONSULTATION.price,
      PROOF_SPRINT.price,
      LAUNCH.price,
    ]);
    expect(CONSULTATION.price).toBe('$300');
    expect(PROOF_SPRINT.price).toBe('$3,997');
    expect(LAUNCH.price).toBe('$14,500');
    expect(quote.lines.map((line) => line.title)).toEqual([
      'Consultation',
      'Proof Sprint',
      'Launch',
    ]);

    const hour = quote.lines.find((line) => line.id === 'consultation');
    const plan = quote.lines.find((line) => line.id === 'proof-sprint');
    const launch = quote.lines.find((line) => line.id === 'launch-package');
    expect(hour?.detail).toBe(CONSULTATION_QUOTE_DETAIL);
    expect(hour?.detail).toContain('proof gaps');
    expect(hour?.detail).toContain('Pay $300 when you book the hour');
    expect(hour?.detail).toContain('No holdback');
    expect(hour?.detail).toContain('No leftover site');
    expect(plan?.highlighted).toBe(true);
    expect(plan?.detail).toBe(PROOF_QUOTE_DETAIL);
    expect(plan?.detail).toMatch(/^One site\./);
    expect(plan?.detail).toContain('One receipted action you operate');
    expect(plan?.detail).toContain('Stage B is included');
    expect(plan?.detail).toContain('Invoice $3,997 before we start');
    expect(plan?.detail).toContain('Credits 100% to Launch');
    expect(plan?.detail).toContain('45 days');
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

  it('prices Consultation at $300 times the selected count', () => {
    const quote = buildQuote({
      hoster: 'studio',
      outcome: 'consultation',
      places: 'one',
      consultationHours: 2,
    });
    const consultation = quote.lines.find((line) => line.id === 'consultation');
    expect(consultation?.price).toBe('$600');
    expect(consultation?.title).toBe('Consultation');
    expect(consultation?.detail).toContain('Pay $600 when you book the hours');
    expect(JSON.stringify(quote)).not.toMatch(/\bHour\b/);
    expect(quote.lines.map((line) => line.title)).not.toContain('Stage B');
  });

  it('keeps Stage B off unless asked, and ignores a guest waive', () => {
    const off = buildQuote({
      hoster: 'studio',
      outcome: 'consultation',
      places: 'one',
      stageBWaive: true,
      viewerRole: 'guest',
    });
    expect(off.lines.some((line) => line.id.startsWith('stage-b'))).toBe(false);

    const on = buildQuote({
      hoster: 'studio',
      outcome: 'consultation',
      places: 'one',
      stageB: true,
      stageBWaive: true,
      viewerRole: 'guest',
    });
    expect(on.lines.find((line) => line.id === 'stage-b-list')?.price).toBe('$297');
    expect(on.lines.some((line) => line.id === 'stage-b-credit')).toBe(false);
  });

  it('shows an owner waive as the list price plus a credit', () => {
    const quote = buildQuote({
      hoster: 'studio',
      outcome: 'consultation',
      places: 'one',
      stageB: true,
      stageBWaive: true,
      viewerRole: 'owner',
    });
    expect(quote.lines.find((line) => line.id === 'stage-b-list')?.price).toBe('$297');
    expect(quote.lines.find((line) => line.id === 'stage-b-credit')?.price).toBe('$297');
    expect(quote.lines.find((line) => line.id === 'stage-b-due')?.price).toBe('$0');
  });

  it('does not add a second Stage B charge when the offer already includes it', () => {
    const quote = buildQuote({
      hoster: 'studio',
      outcome: 'plan',
      places: 'one',
      stageB: true,
      stageBWaive: true,
      viewerRole: 'owner',
    });
    expect(quote.lines.find((line) => line.id === 'stage-b')?.price).toBe('Included');
    expect(quote.lines.some((line) => line.id === 'stage-b-credit')).toBe(false);
  });
});
