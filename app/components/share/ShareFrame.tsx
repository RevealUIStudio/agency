import { Link } from '@revealui/router';
import type { ReactNode } from 'react';
import { RouteHead } from '@/components/RouteHead';
import { isShareSeed, SHARE_PATHS } from '@/lib/share-host';
import { type ChromeLevel, shareChrome } from '@/lib/share-stage-b';

const CIRCUIT_R_NAV_SRC = '/revealui-mark.svg';
const CIRCUIT_R_NAV_PX = 48;

const SHARE_NAV = [
  { href: '/', label: 'Home' },
  { href: '/walkthrough', label: 'Walkthrough' },
  { href: '/pack', label: 'Pack' },
  { href: '/onboarding', label: 'Onboarding' },
  { href: '/demo', label: 'Demo' },
] as const;

export function ShareFrame({
  slug,
  title,
  children,
  chromeLevel = 'studio',
}: {
  slug: string;
  title: string;
  children: ReactNode;
  chromeLevel?: ChromeLevel;
}) {
  const seeded = isShareSeed(slug);
  const chrome = shareChrome(slug, chromeLevel);
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <RouteHead />
      <div
        data-share-watermark="example"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
      >
        <span className="rotate-[-18deg] text-7xl font-bold tracking-widest text-foreground/10 sm:text-8xl">
          EXAMPLE
        </span>
      </div>
      <header className="relative z-20 border-b border-border" data-chrome-level={chrome.level}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-4">
          {chrome.showStudioMark ? (
            <span
              data-circuit-r-chrome
              className="relative block shrink-0 overflow-hidden"
              style={{
                width: CIRCUIT_R_NAV_PX,
                height: CIRCUIT_R_NAV_PX,
                ['--circuit-r-chrome-px' as string]: `${CIRCUIT_R_NAV_PX}px`,
              }}
            >
              <img
                src={CIRCUIT_R_NAV_SRC}
                alt=""
                width={CIRCUIT_R_NAV_PX}
                height={CIRCUIT_R_NAV_PX}
                className="block size-full max-w-none"
              />
            </span>
          ) : null}
          <div>
            {chrome.showStudioName ? (
              <p className="text-sm font-semibold text-foreground">RevealUI Studio</p>
            ) : null}
            <p className="text-sm text-muted-foreground">{chrome.subtitle}</p>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl flex-wrap gap-4 px-6 pb-4 text-sm font-medium text-muted-foreground">
          {SHARE_NAV.map((item) => (
            <Link key={item.href} to={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="main-content" className="relative z-20 mx-auto max-w-3xl px-6 py-12">
        <p role="status" className="text-sm font-semibold uppercase tracking-wider text-primary">
          EXAMPLE. This share shell is a placeholder.
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{title}</h1>
        <div className="mt-6 space-y-4 text-base leading-7 text-muted-foreground">{children}</div>
        {seeded ? (
          <p className="mt-8 text-sm">
            Seeded notes:{' '}
            <a className="font-semibold text-foreground underline" href={`/share/${slug}/pack.txt`}>
              /share/{slug}/pack.txt
            </a>
          </p>
        ) : (
          <p className="mt-8 text-sm">No seeded pack for this slug yet.</p>
        )}
      </main>
      <p className="sr-only">Share paths: {SHARE_PATHS.join(' ')}</p>
    </div>
  );
}
