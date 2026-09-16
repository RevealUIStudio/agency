import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COOKIE_NAME, DENIED, writeConsent } from '@/lib/cookie-consent';

const init = vi.fn();
const getClient = vi.fn();
const withScope = vi.fn((cb: (scope: { setExtra: (k: string, v: unknown) => void }) => void) => {
  cb({ setExtra: vi.fn() });
});
const captureException = vi.fn();
const browserTracingIntegration = vi.fn(() => ({ name: 'BrowserTracing' }));
const replayIntegration = vi.fn((_opts?: unknown) => ({ name: 'Replay' }));

vi.mock('@sentry/react', () => ({
  init: (...args: unknown[]) => init(...args),
  getClient: () => getClient(),
  withScope: (cb: (scope: { setExtra: (k: string, v: unknown) => void }) => void) => withScope(cb),
  captureException: (...args: unknown[]) => captureException(...args),
  browserTracingIntegration: () => browserTracingIntegration(),
  replayIntegration: (opts: unknown) => replayIntegration(opts),
}));

const TEST_DSN = 'test-dsn';

async function loadSentry() {
  return import('@/lib/sentry');
}

afterEach(() => {
  // biome-ignore lint/suspicious/noDocumentCookie: test cleanup of the consent cookie
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/`;
  init.mockReset();
  getClient.mockReset();
  withScope.mockClear();
  captureException.mockReset();
  browserTracingIntegration.mockClear();
  replayIntegration.mockClear();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('readSentryDsn / sentrySampleRates', () => {
  it('treats a missing or blank DSN as absent', async () => {
    const { readSentryDsn } = await loadSentry();
    expect(readSentryDsn({})).toBeNull();
    expect(readSentryDsn({ VITE_SENTRY_DSN: '   ' })).toBeNull();
    expect(readSentryDsn({ VITE_SENTRY_DSN: TEST_DSN })).toBe(TEST_DSN);
  });

  it('enables tracing and on-error replay only with consent and production', async () => {
    const { sentrySampleRates } = await loadSentry();
    expect(sentrySampleRates(true, true)).toEqual({
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1,
    });
    expect(sentrySampleRates(true, false)).toEqual({
      tracesSampleRate: 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    });
    expect(sentrySampleRates(false, true)).toEqual({
      tracesSampleRate: 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    });
  });
});

describe('initSentry', () => {
  beforeEach(() => {
    getClient.mockReturnValue(undefined);
  });

  it('no-ops without a DSN', async () => {
    writeConsent({ ...DENIED, analytics: true });
    const { initSentry } = await loadSentry();
    expect(initSentry({ PROD: true, MODE: 'production' })).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it('no-ops with a DSN when analytics consent is missing', async () => {
    const { initSentry } = await loadSentry();
    expect(initSentry({ VITE_SENTRY_DSN: TEST_DSN, PROD: true, MODE: 'production' })).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it('initializes the SDK with DSN + consent and consented production rates', async () => {
    writeConsent({ ...DENIED, analytics: true });
    const { initSentry } = await loadSentry();
    expect(initSentry({ VITE_SENTRY_DSN: TEST_DSN, PROD: true, MODE: 'production' })).toBe(true);
    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: TEST_DSN,
        environment: 'production',
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1,
      }),
    );
    const options = init.mock.calls[0]?.[0] as { integrations: unknown[] };
    expect(options.integrations).toHaveLength(2);
    expect(browserTracingIntegration).toHaveBeenCalled();
    expect(replayIntegration).toHaveBeenCalledWith({
      maskAllText: true,
      blockAllMedia: true,
    });
  });

  it('initializes with DSN + consent in development but keeps tracing and replay at 0', async () => {
    writeConsent({ ...DENIED, analytics: true });
    const { initSentry } = await loadSentry();
    expect(initSentry({ VITE_SENTRY_DSN: TEST_DSN, PROD: false, MODE: 'development' })).toBe(true);
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: TEST_DSN,
        tracesSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        integrations: [],
      }),
    );
  });

  it('does not call init again when the SDK is already live', async () => {
    writeConsent({ ...DENIED, analytics: true });
    getClient.mockReturnValue({ getOptions: () => ({}) });
    const { initSentry } = await loadSentry();
    expect(initSentry({ VITE_SENTRY_DSN: TEST_DSN, PROD: true, MODE: 'production' })).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it('drops non-production events in beforeSend and redacts cookies', async () => {
    writeConsent({ ...DENIED, analytics: true });
    const { initSentry } = await loadSentry();
    initSentry({ VITE_SENTRY_DSN: TEST_DSN, PROD: false, MODE: 'development' });
    const options = init.mock.calls[0]?.[0] as {
      beforeSend: (event: {
        request?: { cookies?: string; headers?: Record<string, string> };
      }) => unknown;
    };
    expect(options.beforeSend({ request: { cookies: 'secret=1' } })).toBeNull();

    init.mockReset();
    initSentry({ VITE_SENTRY_DSN: TEST_DSN, PROD: true, MODE: 'production' });
    const prodOptions = init.mock.calls[0]?.[0] as {
      beforeSend: (event: { request?: { cookies?: string; headers?: Record<string, string> } }) => {
        request?: { cookies?: string; headers?: Record<string, string> };
      } | null;
    };
    const sent = prodOptions.beforeSend({
      request: {
        cookies: 'secret=1',
        headers: { Authorization: 'Bearer tok', Accept: 'text/html' },
      },
    });
    expect(sent?.request?.cookies).toBeUndefined();
    expect(sent?.request?.headers).toEqual({
      Authorization: '[REDACTED]',
      Accept: 'text/html',
    });
  });
});

describe('captureRenderError', () => {
  it('no-ops when the SDK was never initialised', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', TEST_DSN);
    getClient.mockReturnValue(undefined);
    const { captureRenderError } = await loadSentry();
    captureRenderError(new Error('boom'), { componentStack: 'at Foo' });
    expect(captureException).not.toHaveBeenCalled();
  });

  it('forwards the exception when a DSN is set and the client exists', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', TEST_DSN);
    getClient.mockReturnValue({ getOptions: () => ({}) });
    const { captureRenderError } = await loadSentry();
    const error = new Error('boom');
    captureRenderError(error, { componentStack: 'at Foo' });
    expect(captureException).toHaveBeenCalledWith(error);
  });
});
