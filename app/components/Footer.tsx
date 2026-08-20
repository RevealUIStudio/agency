import { Link } from '@revealui/router';
import { publishedCases } from '@/data/cases';
import { publishedPress } from '@/data/press';
import {
  CONTACT_EMAIL,
  INTRO_CALL_URL,
  STUDIO_CITY,
  STUDIO_LEGAL_NAME,
  STUDIO_REGION,
  SUBSTACK_URL,
} from '@/lib/site';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">RevealUI Studio</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              A software studio in {STUDIO_CITY}, {STUDIO_REGION}. Three paid offers. Invoice after
              we book.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Offers</h4>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/services" className="hover:text-foreground transition-colors">
                  Working session, written plan, launch package
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Studio</h4>
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
                <a
                  href={INTRO_CALL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Book a 30-minute intro
                </a>
              </li>
              {SUBSTACK_URL ? (
                <li>
                  <a
                    href={SUBSTACK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    Substack
                  </a>
                </li>
              ) : null}
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
            <h4 className="text-sm font-semibold text-foreground">Reach us</h4>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="hover:text-foreground transition-colors"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                {STUDIO_CITY}, {STUDIO_REGION}
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
