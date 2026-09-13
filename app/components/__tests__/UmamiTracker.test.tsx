import '@testing-library/jest-dom/vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UmamiTracker } from '@/components/UmamiTracker';
import { UMAMI_SCRIPT_FLAG } from '@/lib/umami';

const websiteId = '0fbf4090-7768-47f8-9f85-5ab24a822160';

function umamiScripts(): HTMLScriptElement[] {
  return [...document.querySelectorAll<HTMLScriptElement>(`script[${UMAMI_SCRIPT_FLAG}]`)];
}

afterEach(() => {
  for (const script of umamiScripts()) {
    script.remove();
  }
  vi.unstubAllEnvs();
  cleanup();
});

describe('UmamiTracker', () => {
  it('does not inject a script when env is unset', () => {
    render(<UmamiTracker />);
    expect(umamiScripts()).toHaveLength(0);
  });

  it('injects the official tracker once after mount', async () => {
    vi.stubEnv('VITE_UMAMI_URL', 'https://revealui-umami.fly.dev');
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', websiteId);

    const { rerender } = render(<UmamiTracker />);
    rerender(<UmamiTracker />);

    await waitFor(() => {
      expect(umamiScripts()).toHaveLength(1);
    });
    const script = umamiScripts()[0];
    expect(script).toBeDefined();
    expect(script).toHaveAttribute('src', 'https://revealui-umami.fly.dev/script.js');
    expect(script).toHaveAttribute('data-website-id', websiteId);
    expect(script?.defer).toBe(true);
  });
});
