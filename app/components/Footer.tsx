import { Link } from '@revealui/router';
import { publishedCases } from '@/data/cases';
import { publishedPress } from '@/data/press';
import { CONTACT_EMAIL } from '@/lib/site';
import { PoweredByRevealUI } from './agency/PoweredByRevealUI';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">RevealUI Studio</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Reference forward-deploy practice on the RevealUI runtime.
            </p>
            <PoweredByRevealUI className="mt-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Services</h4>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/services" className="hover:text-foreground transition-colors">
                  All services
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Company</h4>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/about" className="hover:text-foreground transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-foreground transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-foreground transition-colors">
                  Terms
                </Link>
              </li>
              {publishedCases.length > 0 && (
                <li>
                  <Link to="/cases" className="hover:text-foreground transition-colors">
                    Engagements
                  </Link>
                </li>
              )}
              {publishedPress.length > 0 && (
                <li>
                  <Link to="/press" className="hover:text-foreground transition-colors">
                    Press
                  </Link>
                </li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Open source</h4>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://revealui.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  RevealUI platform
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/RevealUIStudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://docs.revealui.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Documentation
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {year} REVEALUI STUDIO L.L.C. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">Tennessee LLC · {CONTACT_EMAIL}</p>
        </div>
      </div>
    </footer>
  );
}
