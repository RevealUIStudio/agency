import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const captureRenderError = vi.fn();

vi.mock('@/lib/sentry', () => ({
  captureRenderError: (...args: unknown[]) => captureRenderError(...args),
}));

function Boom(): null {
  throw new Error('render-boom');
}

afterEach(() => {
  captureRenderError.mockReset();
  cleanup();
});

describe('ErrorBoundary', () => {
  it('forwards render errors to Sentry and shows the fallback', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(captureRenderError).toHaveBeenCalledTimes(1);
    expect(captureRenderError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    spy.mockRestore();
  });
});
