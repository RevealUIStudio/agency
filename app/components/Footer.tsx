import { Link } from '@revealui/router';
import { CONTACT_EMAIL, DOCS_URL, STUDIO_LEGAL_NAME } from '@/lib/site';

const footerLinks = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/terms', label: 'Terms' },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 sm:gap-16 sm:py-20">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <nav aria-label="Footer">
            <ul className="flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-10 sm:gap-y-4">
              <li>
                <a
                  href={DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Documentation
                </a>
              </li>
              {footerLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link to={href} className="hover:text-foreground transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="text-sm text-muted-foreground">
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-foreground transition-colors">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          © {year} {STUDIO_LEGAL_NAME}
        </p>
      </div>
    </footer>
  );
}
