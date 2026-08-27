import '@testing-library/jest-dom/vitest';
import { Router, RouterProvider } from '@revealui/router';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RouteHead } from '@/components/RouteHead';

const HOME_TITLE = 'RevealUI Studio | Product studio for runtime, receipts, and Launch';

function renderAt(path: string) {
  const router = new Router();
  router.registerRoutes([
    { path: '/', component: () => null, meta: { title: HOME_TITLE } },
    { path: '/services', component: () => null, meta: { title: 'Services | RevealUI Studio' } },
    {
      path: '/about',
      component: () => null,
      meta: { title: 'About | RevealUI Studio', description: 'Per-route description.' },
    },
    {
      path: '/cases',
      component: () => null,
      meta: { title: 'Engagements | RevealUI Studio', robots: 'noindex,nofollow' },
    },
  ]);
  window.history.pushState({}, '', path);
  return render(
    <RouterProvider router={router}>
      <RouteHead />
    </RouterProvider>,
  );
}

describe('RouteHead', () => {
  it('sets document.title from the active route meta', () => {
    renderAt('/services');
    expect(document.title).toBe('Services | RevealUI Studio');
  });

  it('applies the full home title at the root path', () => {
    renderAt('/');
    expect(document.title).toBe(HOME_TITLE);
  });

  it('updates the description meta tag when the route declares one', () => {
    document.head.innerHTML = '<meta name="description" content="static" />';
    renderAt('/about');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Per-route description.',
    );
  });

  it('writes robots from route meta and defaults to index,follow', () => {
    document.head.innerHTML = '';
    renderAt('/');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'index,follow',
    );
  });

  it('marks empty engagement routes noindex', () => {
    document.head.innerHTML = '';
    renderAt('/cases');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex,nofollow',
    );
  });
});
