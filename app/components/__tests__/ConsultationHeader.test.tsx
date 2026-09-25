import '@testing-library/jest-dom/vitest';
import { Router, RouterProvider } from '@revealui/router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { RootLayout } from '@/layouts/RootLayout';

afterEach(cleanup);

function renderAt(path: string) {
  const router = new Router();
  router.registerRoutes([
    { path: '/', component: () => null },
    { path: '/consultation/book', component: () => null },
    { path: '/consultation/book/success', component: () => null },
    { path: '/consultation/book/cancel', component: () => null },
    { path: '/process', component: () => null },
  ]);
  window.history.pushState({}, '', path);
  return render(
    <RouterProvider router={router}>
      <RootLayout>
        <p>Page body</p>
      </RootLayout>
    </RouterProvider>,
  );
}

describe('consultation book chrome', () => {
  it('keeps the marketing intro CTA on the rest of the site', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: 'Book a 30-minute intro' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Process' })).toBeInTheDocument();
    expect(screen.queryByText('Consultation')).not.toBeInTheDocument();
  });

  it('uses a slim Studio header on book, success, and cancel', () => {
    for (const path of [
      '/consultation/book',
      '/consultation/book/success',
      '/consultation/book/cancel',
    ]) {
      cleanup();
      renderAt(path);
      expect(screen.getByText('RevealUI Studio')).toBeInTheDocument();
      expect(screen.getByText('Consultation')).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: 'Book a 30-minute intro' }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Quote' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Process' })).not.toBeInTheDocument();
      const home = screen.getByRole('link', { name: /RevealUI Studio/i });
      expect(home).toHaveAttribute('href', '/');
      expect(home.querySelector('img')).toHaveAttribute('src', '/revealui-mark.svg');
      expect(home.querySelector('img')).toHaveAttribute('width', '32');
    }
  });
});
