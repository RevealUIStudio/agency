import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CookieConsent } from '@/components/CookieConsent';
import { COOKIE_NAME } from '@/lib/cookie-consent';
import { UMAMI_SCRIPT_FLAG } from '@/lib/umami';

vi.mock('@vercel/speed-insights/react', () => ({
  SpeedInsights: () => <div data-testid="speed-insights" />,
}));

const websiteId = '0fbf4090-7768-47f8-9f85-5ab24a822160';

function umamiScripts(): HTMLScriptElement[] {
  return [...document.querySelectorAll<HTMLScriptElement>(`script[${UMAMI_SCRIPT_FLAG}]`)];
}

afterEach(() => {
  // biome-ignore lint/suspicious/noDocumentCookie: test cleanup of the consent cookie
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/`;
  for (const script of umamiScripts()) {
    script.remove();
  }
  vi.unstubAllEnvs();
  cleanup();
});

describe('CookieConsent analytics gate', () => {
  it('loads Speed Insights and Umami only after accept', async () => {
    vi.stubEnv('VITE_UMAMI_URL', 'https://revealui-umami.fly.dev');
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', websiteId);

    render(<CookieConsent />);
    expect(screen.queryByTestId('speed-insights')).not.toBeInTheDocument();
    expect(umamiScripts()).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    expect(screen.queryByTestId('speed-insights')).not.toBeInTheDocument();
    expect(umamiScripts()).toHaveLength(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    cleanup();
    // biome-ignore lint/suspicious/noDocumentCookie: reset so the next mount is undecided
    document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/`;

    render(<CookieConsent />);
    fireEvent.click(screen.getByRole('button', { name: 'Accept all' }));

    expect(screen.getByTestId('speed-insights')).toBeInTheDocument();
    await waitFor(() => {
      expect(umamiScripts()).toHaveLength(1);
    });
  });
});
