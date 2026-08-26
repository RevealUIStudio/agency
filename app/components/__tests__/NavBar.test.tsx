import '@testing-library/jest-dom/vitest';
import { Router, RouterProvider } from '@revealui/router';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NavBar } from '@/components/NavBar';

afterEach(cleanup);

const MENU_ID = 'mobile-nav';

// NavBar reads useLocation (for close-on-route), so it must render inside a
// RouterProvider.
function renderNavBar() {
  const router = new Router();
  router.registerRoutes([
    { path: '/', component: () => null },
    { path: '/services', component: () => null },
    { path: '/process', component: () => null },
    { path: '/about', component: () => null },
  ]);
  window.history.pushState({}, '', '/');
  const utils = render(
    <RouterProvider router={router}>
      <NavBar />
    </RouterProvider>,
  );
  return { router, ...utils };
}

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

describe('NavBar (agency)', () => {
  it('uses a Circuit-R-only home mark and does not print RevealUI or RevealUI Studio', () => {
    renderNavBar();
    const home = screen.getByRole('link', { name: 'Home' });
    const mark = home.querySelector('img');
    expect(mark).not.toBeNull();
    expect(mark).toHaveAttribute('src', '/revealui-mark.svg');
    expect(mark).toHaveAttribute('height', '36');
    expect(mark).not.toHaveAttribute('width');
    expect(mark).toHaveClass('h-9', 'w-auto');
    expect(mark).not.toHaveClass('w-9');
    expect(mark?.getAttribute('src')).not.toBe('/favicon.svg');
    expect(home).toHaveAttribute('href', '/');
    const nav = screen.getByRole('navigation');
    expect(nav.textContent ?? '').not.toMatch(/RevealUI/);
    expect(nav.textContent ?? '').not.toMatch(/Studio/);
    expect(screen.queryByRole('link', { name: /founder@revealui\.com/i })).not.toBeInTheDocument();
    const process = screen.getByRole('link', { name: 'Process' });
    expect(process).toHaveAttribute('href', '/process');
  });

  it('opens the menu and flips the trigger to a disclosure close state', () => {
    renderNavBar();
    expect(document.getElementById(MENU_ID)).not.toBeInTheDocument();

    openMenu();

    expect(document.getElementById(MENU_ID)).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Close menu', expanded: true });
    expect(toggle).toHaveAttribute('aria-controls', MENU_ID);
  });

  it('closes the menu when Escape is pressed', () => {
    renderNavBar();
    openMenu();
    expect(document.getElementById(MENU_ID)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.getElementById(MENU_ID)).not.toBeInTheDocument();
  });

  it('closes the menu on a pointer-down outside the panel (tap-outside)', () => {
    renderNavBar();
    openMenu();
    expect(document.getElementById(MENU_ID)).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(document.getElementById(MENU_ID)).not.toBeInTheDocument();
  });

  it('keeps the menu open on a pointer-down inside the panel', () => {
    renderNavBar();
    openMenu();
    const menu = document.getElementById(MENU_ID);
    expect(menu).toBeInTheDocument();

    fireEvent.pointerDown(menu as HTMLElement);
    expect(document.getElementById(MENU_ID)).toBeInTheDocument();
  });

  it('closes the menu after a client-side route change (covers back/forward)', () => {
    const { router } = renderNavBar();
    openMenu();
    expect(document.getElementById(MENU_ID)).toBeInTheDocument();

    // Programmatic navigation (as a browser back/forward would trigger) must
    // close the menu via the close-on-route effect, not just per-link onClick.
    act(() => {
      router.navigate('/about');
    });
    expect(document.getElementById(MENU_ID)).not.toBeInTheDocument();
  });

  it('locks body scroll while open and restores it on close', () => {
    renderNavBar();
    expect(document.body.style.overflow).toBe('');

    openMenu();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.body.style.overflow).toBe('');
  });
});
