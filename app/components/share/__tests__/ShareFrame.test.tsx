import '@testing-library/jest-dom/vitest';
import { Router, RouterProvider } from '@revealui/router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { shareRouteTable } from '@/routes/share/SharePages';

function renderShare(path: string) {
  const router = new Router();
  router.registerRoutes(shareRouteTable('omega'));
  window.history.pushState({}, '', path);
  return render(
    <RouterProvider router={router}>
      {(() => {
        const match = router.match(path);
        const Page = match?.route.component;
        if (!Page) throw new Error(`no share route for ${path}`);
        return <Page />;
      })()}
    </RouterProvider>,
  );
}

describe('omega share shell', () => {
  it('shows Circuit-R, Studio, Omega, and the EXAMPLE watermark on home', () => {
    renderShare('/');
    expect(screen.getByRole('heading', { level: 1, name: 'omega share' })).toBeInTheDocument();
    expect(screen.getByText('RevealUI Studio')).toBeInTheDocument();
    expect(screen.getByText(/Omega · Stage A · omega.revealuistudio.com/)).toBeInTheDocument();
    expect(document.querySelector('[data-circuit-r-chrome] img')).toHaveAttribute(
      'src',
      '/revealui-mark.svg',
    );
    expect(document.querySelector('[data-share-watermark="example"]')).not.toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('EXAMPLE');
    expect(screen.getByRole('link', { name: '/share/omega/pack.txt' })).toHaveAttribute(
      'href',
      '/share/omega/pack.txt',
    );
  });

  it.each([
    '/walkthrough',
    '/pack',
    '/onboarding',
    '/demo',
  ])('renders %s inside the share shell', (path) => {
    renderShare(path);
    expect(screen.getByRole('status')).toHaveTextContent('EXAMPLE');
    expect(document.querySelector('[data-circuit-r-chrome]')).not.toBeNull();
  });
});
