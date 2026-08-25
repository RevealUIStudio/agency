import {
  Button,
  IconClose,
  IconMenu,
  LinkButton,
  useClickOutside,
  useEscapeKey,
  useScrollLock,
} from '@revealui/presentation';
import { Link, useLocation } from '@revealui/router';
import { useEffect, useRef, useState } from 'react';
import { publishedCases } from '@/data/cases';
import { publishedPress } from '@/data/press';
import { INTRO_CALL_URL } from '@/lib/site';

const navLinks = [
  { href: '/#calculator', label: 'Quote' },
  { href: '/process', label: 'Process' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function NavBar() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);
  const { pathname } = useLocation();

  // Mobile-menu closers, matching the marketing NavBar: lock body scroll while
  // open, close on Escape, and close on a pointer-down outside the panel. We
  // pass both the panel and the toggle to useClickOutside so tapping the
  // hamburger to close doesn't double-fire. A visual `fixed` backdrop is
  // intentionally avoided — the sticky header's backdrop-blur creates a
  // containing block that would clip it.
  useScrollLock(open);
  useEscapeKey(close, open);
  useClickOutside([menuRef, toggleRef], close, open);

  // Close after a client-side navigation (also covers browser back/forward,
  // where a link's own onClick never fires).
  // `pathname` is the trigger, not a value the body reads. The rule's autofix
  // would drop it and leave the mobile menu open across navigations.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the navigation trigger
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" onClick={close} aria-label="Home" className="flex items-center">
          <img src="/revealui-mark.svg" alt="" width={36} height={36} className="h-9 w-9" />
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
        </div>

        <div className="flex items-center gap-3">
          {/* Desktop CTA (md+) */}
          <div className="hidden md:block">
            <LinkButton href={INTRO_CALL_URL} external>
              Book a 30-minute intro
            </LinkButton>
          </div>

          {/* Hamburger (<md). 44x44 tap target via presentation size=icon. */}
          <Button
            ref={toggleRef}
            type="button"
            appearance="ghost"
            variant="neutral"
            size="icon"
            className="-mr-1 text-muted-foreground md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? (
              <IconClose size="md" strokeWidth={2} />
            ) : (
              <IconMenu size="md" strokeWidth={2} />
            )}
          </Button>
        </div>
      </nav>

      {/* Mobile menu (<md) */}
      {open && (
        <div
          id="mobile-nav"
          ref={menuRef}
          className="border-t border-border bg-card px-6 py-4 md:hidden"
        >
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
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <LinkButton href={INTRO_CALL_URL} external onClick={close} className="w-full">
              Book a 30-minute intro
            </LinkButton>
          </div>
        </div>
      )}
    </header>
  );
}
