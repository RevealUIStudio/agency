import { useLocation } from '@revealui/router';
import { type ReactNode, useEffect, useRef } from 'react';
import { Footer } from '../components/Footer';
import { NavBar } from '../components/NavBar';
import { RouteHead } from '../components/RouteHead';

export function RootLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isInitialRender = useRef(true);

  // On client-side navigation (not the initial load), move focus to <main> and
  // reset scroll so keyboard and screen-reader users land on the new page's
  // content instead of staying on the just-clicked nav link (WCAG 2.4.3 / 4.1.3).
  // biome-ignore lint/correctness/useExhaustiveDependencies: `pathname` is the
  // trigger, not a value the body reads. Removing it (the rule's autofix) would
  // run this once on mount and never again, silently breaking focus + scroll
  // reset on every client-side navigation.
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    mainRef.current?.focus();
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <RouteHead />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-lg focus:outline focus:outline-2 focus:outline-ring"
      >
        Skip to content
      </a>
      <NavBar />
      <main id="main-content" ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer />
    </div>
  );
}
