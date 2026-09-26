import '@testing-library/jest-dom/vitest';
import { Router, RouterProvider } from '@revealui/router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShareFrame } from '@/components/share/ShareFrame';
import { type ChromeLevel } from '@/lib/share-stage-b';
import { shareRouteTable } from '@/routes/share/SharePages';

function renderShare(path: string) {
  const router = new Router();
  router.registerRoutes(shareRouteTable('demo'));
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

describe('demo share shell', () => {
  it('shows Circuit-R, Studio, Demo, and the EXAMPLE watermark on home', () => {
    renderShare('/');
    expect(screen.getByRole('heading', { level: 1, name: 'demo share' })).toBeInTheDocument();
    expect(screen.getByText('RevealUI Studio')).toBeInTheDocument();
    expect(screen.getByText(/Demo · Stage A · demo.revealuistudio.com/)).toBeInTheDocument();
    expect(document.querySelector('[data-circuit-r-chrome] img')).toHaveAttribute(
      'src',
      '/revealui-mark.svg',
    );
    expect(document.querySelector('[data-share-watermark="example"]')).not.toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('EXAMPLE');
    expect(screen.getByRole('link', { name: '/share/demo/pack.txt' })).toHaveAttribute(
      'href',
      '/share/demo/pack.txt',
    );
  });

  it.each([
    '/dns',
    '/path',
    '/proof-gap',
    '/stack',
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

function renderFrame(chromeLevel: ChromeLevel) {
  const router = new Router();
  router.registerRoutes([
    {
      path: '/',
      component: () => null,
      meta: { title: 't', description: 'd' },
    },
  ]);
  window.history.pushState({}, '', '/');
  return render(
    <RouterProvider router={router}>
      <ShareFrame slug="demo" title="demo share" chromeLevel={chromeLevel}>
        <p>body</p>
      </ShareFrame>
    </RouterProvider>,
  );
}

describe('share chrome levels', () => {
  it('renders studio, co-brand, and white label differently', () => {
    const studio = renderFrame('studio');
    expect(studio.getByText('RevealUI Studio')).toBeInTheDocument();
    expect(studio.getByText('Demo · Stage A · demo.revealuistudio.com')).toBeInTheDocument();
    expect(studio.container.querySelector('[data-circuit-r-chrome]')).not.toBeNull();
    const studioText = studio.container.querySelector('[data-chrome-level]')?.textContent ?? '';
    studio.unmount();

    const cobrand = renderFrame('co-brand');
    expect(cobrand.getByText('RevealUI Studio')).toBeInTheDocument();
    expect(cobrand.getByText('Demo · Co-brand')).toBeInTheDocument();
    expect(cobrand.container.querySelector('[data-chrome-level="co-brand"]')).not.toBeNull();
    const cobrandText = cobrand.container.querySelector('[data-chrome-level]')?.textContent ?? '';
    cobrand.unmount();

    const white = renderFrame('white_label');
    expect(white.queryByText('RevealUI Studio')).not.toBeInTheDocument();
    expect(white.container.querySelector('[data-circuit-r-chrome]')).toBeNull();
    expect(
      white.container.querySelector('[data-chrome-level="white_label"] .text-muted-foreground'),
    ).toHaveTextContent('Demo');
    const whiteText = white.container.querySelector('[data-chrome-level]')?.textContent ?? '';

    expect(studioText).not.toBe(cobrandText);
    expect(cobrandText).not.toBe(whiteText);
    expect(studioText).not.toBe(whiteText);
    expect(whiteText).not.toMatch(/RevealUI/);
  });
});
