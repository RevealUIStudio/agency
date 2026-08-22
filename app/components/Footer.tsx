import { Link } from '@revealui/router';
import { CONTACT_EMAIL, DOCS_URL, STUDIO_CITY, STUDIO_LEGAL_NAME, STUDIO_REGION } from '@/lib/site';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">RevealUI Studio</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              A software studio in {STUDIO_CITY}, {STUDIO_REGION}. Three questions, a quote, or a
              30-minute intro.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="hover:text-foreground transition-colors"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Docs</h4>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href={DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  docs.revealui.com
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Legal</h4>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/privacy" className="hover:text-foreground transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-foreground transition-colors">
                  Cookies
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-foreground transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {year} {STUDIO_LEGAL_NAME}. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            {STUDIO_REGION} LLC · {STUDIO_CITY} · {CONTACT_EMAIL}
          </p>
        </div>
      </div>
    </footer>
  );
}
