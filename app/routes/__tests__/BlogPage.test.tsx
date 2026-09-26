import '@testing-library/jest-dom/vitest';
import { Router, RouterProvider, Routes } from '@revealui/router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BlogPage } from '@/routes/BlogPage';
import { BlogPostPage } from '@/routes/BlogPostPage';
import { NotFoundPage } from '@/routes/NotFoundPage';

afterEach(cleanup);

function renderAt(path: string) {
  const router = new Router();
  router.registerRoutes([
    { path: '/blog', component: BlogPage },
    { path: '/blog/:slug', component: BlogPostPage },
    { path: '/*notfound', component: NotFoundPage },
  ]);
  window.history.pushState({}, '', path);
  return render(
    <RouterProvider router={router}>
      <Routes />
    </RouterProvider>,
  );
}

describe('Studio blog routes', () => {
  it('lists published essays and keeps held essays off the index', () => {
    renderAt('/blog');
    expect(screen.getByRole('heading', { level: 1, name: 'Blog' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Documentation' })).toHaveAttribute(
      'href',
      'https://docs.revealui.com',
    );
    const essay = screen.getByRole('link', {
      name: 'The open runtime for forward-deployed agent work',
    });
    expect(essay).toHaveAttribute('href', '/blog/open-runtime-for-fde-work');
    expect(screen.getByText('July 29, 2026')).toBeInTheDocument();
    expect(screen.queryByText('Why I Built RevealUI')).not.toBeInTheDocument();
    expect(screen.queryByText(/Proof Sprint/)).not.toBeInTheDocument();
  });

  it('renders a published essay and sets the document title', () => {
    renderAt('/blog/zero-regex');
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Building a Codebase With Zero Hand-Written Regex',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Why regex is a liability, not a tool' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('visibility: public')).not.toBeInTheDocument();
    expect(document.title).toBe(
      'Building a Codebase With Zero Hand-Written Regex | RevealUI Studio',
    );
    const back = screen.getByRole('link', { name: 'Back to Blog' });
    expect(back).toHaveAttribute('href', '/blog');
  });

  it('accepts the old docs filename as an alias for a published essay', () => {
    renderAt('/blog/18-open-runtime-for-fde-work');
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'The open runtime for forward-deployed agent work',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Consultation, Pilot, and Launch/)).toBeInTheDocument();
  });

  it('does not publish a held essay', () => {
    renderAt('/blog/why-we-built-revealui');
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });
});
