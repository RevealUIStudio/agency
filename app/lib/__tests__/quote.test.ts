import { describe, expect, it } from 'vitest';
import { ADAPTER_CALC_LABEL, CONSULTATION, LAUNCH, PILOT } from '@/lib/engagements';
import {
  buildQuote,
  DEFAULT_HOSTER,
  DEFAULT_OUTCOME,
  DEFAULT_PLACES,
  DOMAIN_ADD_ON_LABEL,
  INTRO_BODY,
  INTRO_HEADING,
  QUOTE_CALCULATOR_LEAD,
  SELF_HOST_HANDOFF,
} from '@/lib/quote';

describe('buildQuote', () => {
  it('defaults to Studio putting a Pilot live', () => {
    expect(DEFAULT_HOSTER).toBe('studio');
    expect(DEFAULT_OUTCOME).toBe('plan');
    expect(DEFAULT_PLACES).toBe('one');
  });

  it('shows the selected engagement and includes the domain pack without another charge', () => {
    const pilot = buildQuote({ hoster: 'studio', outcome: 'plan', places: 'one' });
    expect(pilot.heading).toBe('Pilot');
    expect(pilot.lines.map((line) => line.price)).toEqual([PILOT.price, 'Included', 'Included']);
    expect(pilot.lines.some((line) => line.id === CONSULTATION.id || line.id === LAUNCH.id)).toBe(
      false,
    );
    const launch = buildQuote({ hoster: 'studio', outcome: 'launch', places: 'one', stageB: true });
    expect(launch.lines.map((line) => line.price)).toEqual([LAUNCH.price, 'Included', 'Included']);
    expect(launch.lines[0]?.detail).toContain('Half before work starts, half on delivery');
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
    expect(quote.lines.map((line) => line.title)).not.toContain('Domain pack');
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
    expect(on.lines.find((line) => line.id === 'stage-b-list')?.title).toBe('Domain add-on');
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
    expect(quote.lines.find((line) => line.id === 'stage-b')?.title).toBe(DOMAIN_ADD_ON_LABEL);
    expect(quote.lines.some((line) => line.id === 'stage-b-credit')).toBe(false);
  });

  it('includes 1 Adapter on Pilot and prices only extras', () => {
    const quote = buildQuote({
      hoster: 'studio',
      outcome: 'plan',
      places: 'one',
      adapterExtras: 2,
    });
    expect(quote.lines.find((line) => line.id === 'adapter-included')?.price).toBe('Included');
    expect(quote.lines.find((line) => line.id === 'adapter-included')?.title).toBe(
      ADAPTER_CALC_LABEL,
    );
    expect(quote.lines.find((line) => line.id === 'adapter-extra')?.title).toBe(
      'Adapter (extra) (2)',
    );
    expect(quote.lines.find((line) => line.id === 'adapter-extra')?.price).toBe('$4,994');
    expect(quote.lines.find((line) => line.id === 'adapter-extra')?.detail).toContain(
      '2nd and later',
    );
    expect(JSON.stringify(quote)).not.toMatch(/Not sold alone/);
  });

  it('includes up to 3 Adapters on Launch and prices the 4th and later', () => {
    const quote = buildQuote({
      hoster: 'studio',
      outcome: 'launch',
      places: 'one',
      adapterExtras: 1,
    });
    expect(quote.lines.find((line) => line.id === 'adapter-included')?.detail).toContain('up to 3');
    expect(quote.lines.find((line) => line.id === 'adapter-extra')?.title).toBe('Adapter (extra)');
    expect(quote.lines.find((line) => line.id === 'adapter-extra')?.price).toBe('$2,497');
    expect(quote.lines.find((line) => line.id === 'adapter-extra')?.detail).toContain(
      '4th and later',
    );
  });

  it('names Care and the Domain add-on on the calculator lead', () => {
    expect(QUOTE_CALCULATOR_LEAD).toContain('Adapter $2,497');
    expect(QUOTE_CALCULATOR_LEAD).toContain('Care $1,997/mo');
    expect(QUOTE_CALCULATOR_LEAD).toContain('Domain add-on $297');
    expect(QUOTE_CALCULATOR_LEAD).not.toMatch(/Stage B/);
    expect(QUOTE_CALCULATOR_LEAD).not.toContain('\u2014');
  });

  it('never adds Adapter lines to a Consultation, even with stale extra answers', () => {
    const consultation = buildQuote({
      hoster: 'studio',
      outcome: 'consultation',
      places: 'one',
      adapterExtras: 1,
    });
    expect(consultation.lines.some((line) => line.id.startsWith('adapter'))).toBe(false);

    const quiet = buildQuote({
      hoster: 'studio',
      outcome: 'consultation',
      places: 'one',
    });
    expect(quiet.lines.some((line) => line.id.startsWith('adapter'))).toBe(false);
  });
});
