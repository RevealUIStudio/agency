import '@testing-library/jest-dom/vitest';
import { Router, RouterProvider } from '@revealui/router';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RouteHead } from '@/components/RouteHead';
import { HOME_DOCUMENT_TITLE } from '@/lib/home-document';
import { headForPathname, type StudioHead } from '@/lib/route-documents';

function renderAt(path: string) {
  const router = new Router();
  router.registerRoutes([
    { path: '/', component: () => null },
    { path: '/services', component: () => null },
    { path: '/about', component: () => null },
    { path: '/cases', component: () => null },
    { path: '/blog', component: () => null },
    { path: '/blog/:slug', component: () => null },
    { path: '/*notfound', component: () => null },
  ]);
  window.history.pushState({}, '', path);
  return render(
    <RouterProvider router={router}>
      <RouteHead />
    </RouterProvider>,
  );
}

function expectHead(head: StudioHead) {
  expect(document.title).toBe(head.title);
  expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
    head.description,
  );
  expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(head.robots);
  expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
    head.title,
  );
  expect(document.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe(
    head.description,
  );
  expect(document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe(
    head.title,
  );
  expect(document.querySelector('meta[name="twitter:description"]')?.getAttribute('content')).toBe(
    head.description,
  );
  if (head.canonicalHref) {
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      head.canonicalHref,
    );
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
      head.canonicalHref,
    );
    expect(document.querySelector('meta[name="twitter:url"]')?.getAttribute('content')).toBe(
      head.canonicalHref,
    );
  } else {
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.querySelector('meta[property="og:url"]')).toBeNull();
    expect(document.querySelector('meta[name="twitter:url"]')).toBeNull();
  }
}

describe('RouteHead', () => {
  it('writes a self canonical and social tags for a buyer route', () => {
    document.head.innerHTML = [
      '<title>Home</title>',
      '<meta name="description" content="static" />',
      '<link rel="canonical" href="https://revealuistudio.com/" />',
      '<meta property="og:title" content="Home" />',
      '<meta property="og:description" content="static" />',
      '<meta property="og:url" content="https://revealuistudio.com/" />',
      '<meta name="twitter:title" content="Home" />',
      '<meta name="twitter:description" content="static" />',
      '<meta name="twitter:url" content="https://revealuistudio.com/" />',
    ].join('');
    renderAt('/services');
    const head = headForPathname('/services');
    expectHead(head);
    expect(head.canonicalHref).toBe('https://revealuistudio.com/services');
    expect(head.title).not.toBe(HOME_DOCUMENT_TITLE);
  });

  it('applies the home title and a trailing-slash canonical at the root path', () => {
    document.head.innerHTML = '';
    renderAt('/');
    const head = headForPathname('/');
    expectHead(head);
    expect(head.title).toBe(HOME_DOCUMENT_TITLE);
    expect(head.canonicalHref).toBe('https://revealuistudio.com/');
  });

  it('marks empty engagement routes noindex without pointing canonical at the homepage', () => {
    document.head.innerHTML = '<link rel="canonical" href="https://revealuistudio.com/" />';
    renderAt('/cases');
    const head = headForPathname('/cases');
    expectHead(head);
    expect(head.robots).toBe('noindex,nofollow');
    expect(head.canonicalHref).toBe('https://revealuistudio.com/cases');
  });

  it('uses noindex and drops the homepage canonical on an unknown path', () => {
    document.head.innerHTML = [
      '<link rel="canonical" href="https://revealuistudio.com/" />',
      '<meta property="og:url" content="https://revealuistudio.com/" />',
      '<meta name="twitter:url" content="https://revealuistudio.com/" />',
    ].join('');
    renderAt('/does-not-exist-audit-404');
    const head = headForPathname('/does-not-exist-audit-404');
    expectHead(head);
    expect(head.robots).toBe('noindex');
    expect(head.title).toBe('404 | RevealUI Studio');
  });

  it('treats an unpublished blog slug as a 404 document', () => {
    document.head.innerHTML = '<link rel="canonical" href="https://revealuistudio.com/" />';
    renderAt('/blog/does-not-exist');
    const head = headForPathname('/blog/does-not-exist');
    expectHead(head);
    expect(head.canonicalHref).toBeNull();
    expect(head.robots).toBe('noindex');
  });

  it('sets the essay title and a self canonical on a published post', () => {
    document.head.innerHTML = '<meta property="og:title" content="Home" />';
    renderAt('/blog/claim-drift');
    const head = headForPathname('/blog/claim-drift');
    expectHead(head);
    expect(head.canonicalHref).toBe('https://revealuistudio.com/blog/claim-drift');
    expect(head.ogType).toBe('article');
    expect(head.title).not.toBe(HOME_DOCUMENT_TITLE);
    expect(document.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe(
      'article',
    );
  });

  it('adds the Studio blog feed link on the blog index and essay paths', () => {
    document.head.innerHTML = '';
    renderAt('/blog');
    const indexLink = document.querySelector('link[rel="alternate"]');
    expect(indexLink?.getAttribute('type')).toBe('application/rss+xml');
    expect(indexLink?.getAttribute('title')).toBe('RevealUI Studio Blog');
    expect(indexLink?.getAttribute('href')).toBe('/rss.xml');
    expect(document.querySelectorAll('link[rel="alternate"]')).toHaveLength(1);

    document.head.innerHTML = '';
    renderAt('/blog/zero-regex');
    const essayLink = document.querySelector('link[rel="alternate"]');
    expect(essayLink?.getAttribute('href')).toBe('/rss.xml');
    expect(essayLink?.getAttribute('title')).toBe('RevealUI Studio Blog');
  });

  it('leaves the feed link off other studio routes', () => {
    document.head.innerHTML =
      '<link rel="alternate" type="application/rss+xml" title="RevealUI Studio Blog" href="/rss.xml">';
    renderAt('/services');
    expect(document.querySelector('link[rel="alternate"]')).toBeNull();
  });
});
