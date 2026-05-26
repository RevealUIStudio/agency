import { LinkButton } from '@revealui/presentation';
import { Link } from '@revealui/router';
import { useState } from 'react';
import { publishedCases } from '../data/cases';
import { publishedPress } from '../data/press';

const navLinks = [
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function NavBar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          to="/"
          onClick={close}
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <span className="text-foreground">RevealUI</span>
          <span className="text-muted-foreground">Studio</span>
        </Link>

        {/* Desktop links (md+) */}
        <div className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          {navLinks.map(({ href, label }) => (
            <Link key={href} to={href} className="hover:text-foreground transition-colors">
              {label}
            </Link>
          ))}
          {publishedCases.length > 0 && (
            <Link to="/cases" className="hover:text-foreground transition-colors">
              Engagements
            </Link>
          )}
          {publishedPress.length > 0 && (
            <Link to="/press" className="hover:text-foreground transition-colors">
              Press
            </Link>
          )}
          <a
            href="https://revealui.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            revealui.com →
          </a>
        </div>

        <div className="flex items-center gap-3">
          {/* Desktop CTA (md+) */}
          <div className="hidden md:block">
            <LinkButton href="/contact">Book a call</LinkButton>
          </div>

          {/* Hamburger (<md) */}
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
            className="-mr-1 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors md:hidden"
          >
            {open ? (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu (<md) */}
      {open && (
        <div id="mobile-nav" className="border-t border-border bg-card px-6 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                to={href}
                onClick={close}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            ))}
            {publishedCases.length > 0 && (
              <Link
                to="/cases"
                onClick={close}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Engagements
              </Link>
            )}
            {publishedPress.length > 0 && (
              <Link
                to="/press"
                onClick={close}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Press
              </Link>
            )}
            <a
              href="https://revealui.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              revealui.com →
            </a>
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <LinkButton href="/contact" onClick={close} className="w-full">
              Book a call
            </LinkButton>
          </div>
        </div>
      )}
    </header>
  );
}
