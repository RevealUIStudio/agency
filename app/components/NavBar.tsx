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
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          to="/"
          onClick={close}
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <span className="text-gray-950">RevealUI</span>
          <span className="text-gray-500">Studio</span>
        </Link>

        {/* Desktop links (md+) */}
        <div className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
          {navLinks.map(({ href, label }) => (
            <Link key={href} to={href} className="hover:text-gray-950 transition-colors">
              {label}
            </Link>
          ))}
          {publishedCases.length > 0 && (
            <Link to="/cases" className="hover:text-gray-950 transition-colors">
              Engagements
            </Link>
          )}
          {publishedPress.length > 0 && (
            <Link to="/press" className="hover:text-gray-950 transition-colors">
              Press
            </Link>
          )}
          <a
            href="https://revealui.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-950 transition-colors"
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
            className="-mr-1 flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 transition-colors md:hidden"
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
        <div id="mobile-nav" className="border-t border-gray-100 bg-white px-6 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                to={href}
                onClick={close}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-950 transition-colors"
              >
                {label}
              </Link>
            ))}
            {publishedCases.length > 0 && (
              <Link
                to="/cases"
                onClick={close}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-950 transition-colors"
              >
                Engagements
              </Link>
            )}
            {publishedPress.length > 0 && (
              <Link
                to="/press"
                onClick={close}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-950 transition-colors"
              >
                Press
              </Link>
            )}
            <a
              href="https://revealui.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-950 transition-colors"
            >
              revealui.com →
            </a>
          </div>
          <div className="mt-4 border-t border-gray-100 pt-4">
            <LinkButton href="/contact" onClick={close} className="w-full">
              Book a call
            </LinkButton>
          </div>
        </div>
      )}
    </header>
  );
}
