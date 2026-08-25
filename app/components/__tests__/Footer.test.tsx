import '@testing-library/jest-dom/vitest';
import { Router, RouterProvider } from '@revealui/router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Footer } from '@/components/Footer';
import { CONTACT_EMAIL, DOCS_URL, STUDIO_LEGAL_NAME } from '@/lib/site';

afterEach(cleanup);

function renderFooter() {
  const router = new Router();
  router.registerRoutes([
    { path: '/', component: () => null },
    { path: '/privacy', component: () => null },
    { path: '/cookies', component: () => null },
    { path: '/terms', component: () => null },
  ]);
  window.history.pushState({}, '', '/');
  return render(
    <RouterProvider router={router}>
      <Footer />
    </RouterProvider>,
  );
}

describe('Footer (agency)', () => {
  it('labels the docs host as Documentation and prints the email once', () => {
    const { container } = renderFooter();
    const docs = screen.getByRole('link', { name: 'Documentation' });
    expect(docs).toHaveAttribute('href', DOCS_URL);
    expect(screen.queryByRole('link', { name: /docs\.revealui\.com/i })).not.toBeInTheDocument();
    const emails = screen.getAllByRole('link', { name: CONTACT_EMAIL });
    expect(emails).toHaveLength(1);
    expect(emails[0]).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}`);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/RevealUI Studio/);
    expect(text).not.toMatch(/\bLLC\b/);
    expect(text).not.toMatch(/Working session|Written plan|Launch package|Fleet/i);
  });

  it('prints the legal name once in small print', () => {
    const { container } = renderFooter();
    const text = container.textContent ?? '';
    const matches = text.match(new RegExp(STUDIO_LEGAL_NAME, 'g')) ?? [];
    expect(matches).toHaveLength(1);
    expect(text).toContain('L.L.C.');
  });
});
