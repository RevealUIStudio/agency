import { afterEach, describe, expect, it } from 'vitest';
import { COOKIE_NAME, DENIED, readConsent, writeConsent } from '../cookie-consent';

afterEach(() => {
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/`;
});

describe('agency cookie consent store', () => {
  it('starts undecided', () => {
    expect(readConsent()).toEqual({ consent: DENIED, decided: false });
  });

  it('round-trips an accept', () => {
    writeConsent({ ...DENIED, analytics: true });
    expect(readConsent()).toEqual({
      decided: true,
      consent: { ...DENIED, analytics: true },
    });
  });
});
