import '@testing-library/jest-dom/vitest';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SentryTracker } from '@/components/SentryTracker';
import { COOKIE_NAME, DENIED, writeConsent } from '@/lib/cookie-consent';

const initSentry = vi.fn();

vi.mock('@/lib/sentry', () => ({
  initSentry: () => initSentry(),
}));

afterEach(() => {
  // biome-ignore lint/suspicious/noDocumentCookie: test cleanup of the consent cookie
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/`;
  initSentry.mockReset();
  cleanup();
});

describe('SentryTracker', () => {
  it('initialises Sentry on mount (parent already gated on consent)', () => {
    writeConsent({ ...DENIED, analytics: true });
    const { rerender } = render(<SentryTracker />);
    rerender(<SentryTracker />);
    expect(initSentry).toHaveBeenCalledTimes(1);
  });
});
