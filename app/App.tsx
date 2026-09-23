import { LinkBehaviorProvider } from '@revealui/presentation';
import { Link, Routes, useRouter } from '@revealui/router';
import { useRef } from 'react';
import { HOME_DOCUMENT_TITLE, HOME_META_DESCRIPTION } from './components/agency/Hero';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  PROOF_GAP_DOCUMENT_TITLE,
  PROOF_GAP_META_DESCRIPTION,
  PROOF_GAP_PATH,
} from './content/proof-gap';
import { publishedCases } from './data/cases';
import { publishedPress } from './data/press';
import { RootLayout } from './layouts/RootLayout';
import { clientSlugFromHost } from './lib/share-host';
import { AboutPage } from './routes/AboutPage';
import { CaseStudyPage } from './routes/CaseStudyPage';
import { CasesPage } from './routes/CasesPage';
import { ContactPage } from './routes/ContactPage';
import { CookiesPage } from './routes/CookiesPage';
import { HomePage } from './routes/HomePage';
import { NotFoundPage } from './routes/NotFoundPage';
import { PressItemPage } from './routes/PressItemPage';
import { PressPage } from './routes/PressPage';
import { PrivacyPage } from './routes/PrivacyPage';
import { ProcessPage } from './routes/ProcessPage';
import { ProofGapPage } from './routes/ProofGapPage';
import { RedirectToCalculator } from './routes/RedirectToCalculator';
import { ServicesPage } from './routes/ServicesPage';
import { shareRouteTable } from './routes/share/SharePages';
import { TermsPage } from './routes/TermsPage';

export function App() {
  const router = useRouter();
  const registered = useRef(false);

  const shareSlug =
    typeof window === 'undefined' ? null : clientSlugFromHost(window.location.hostname);

  if (!registered.current && router.getRoutes().length === 0) {
    if (shareSlug) {
      router.registerRoutes(shareRouteTable(shareSlug));
    } else
      router.registerRoutes([
        {
          path: '/',
          component: HomePage,
          meta: {
            title: HOME_DOCUMENT_TITLE,
            description: HOME_META_DESCRIPTION,
          },
        },
        {
          path: '/services',
          component: ServicesPage,
          meta: {
            title: 'Offers | RevealUI Studio',
            description:
              'Consultation $300. Proof Sprint $3,997. Launch $14,500. Invoice after we book. Book a 30-minute intro first.',
          },
        },
        {
          path: '/pricing',
          component: RedirectToCalculator,
          meta: {
            title: 'Quote | RevealUI Studio',
            description:
              'Studio quote. Consultation $300. Proof Sprint $3,997. Launch $14,500. Licenses live on revealui.com.',
            robots: 'noindex,follow',
          },
        },
        {
          path: '/products',
          component: RedirectToCalculator,
          meta: {
            title: 'Quote | RevealUI Studio',
            description:
              'Studio quote. Consultation $300. Proof Sprint $3,997. Launch $14,500. Licenses live on revealui.com.',
            robots: 'noindex,follow',
          },
        },
        {
          path: '/catalog',
          component: RedirectToCalculator,
          meta: {
            title: 'Quote | RevealUI Studio',
            description:
              'Studio quote. Consultation $300. Proof Sprint $3,997. Launch $14,500. Licenses live on revealui.com.',
            robots: 'noindex,follow',
          },
        },
        {
          path: '/process',
          component: ProcessPage,
          meta: {
            title: 'How we work | RevealUI Studio',
            description:
              'How a RevealUI Studio engagement runs. Consultation $300. Proof Sprint $3,997. Launch $14,500. Book a 30-minute intro on Google Calendar.',
          },
        },
        {
          path: '/about',
          component: AboutPage,
          meta: {
            title: 'About | RevealUI Studio',
            description:
              'RevealUI Studio is for startups, and for technical founders and small agencies who already run agents. Joshua Vaughn runs it. Consultation, Proof Sprint, and Launch. Remote first. Invoice after we agree.',
          },
        },
        {
          path: '/contact',
          component: ContactPage,
          meta: {
            title: 'Contact | RevealUI Studio',
            description:
              'Book a 30-minute intro or email founder@revealui.com. No account. No payment to book the intro.',
          },
        },
        {
          path: PROOF_GAP_PATH,
          component: ProofGapPage,
          meta: {
            title: PROOF_GAP_DOCUMENT_TITLE,
            description: PROOF_GAP_META_DESCRIPTION,
          },
        },
        {
          path: '/cookies',
          component: CookiesPage,
          meta: {
            title: 'Cookies | RevealUI Studio',
            description: 'How revealuistudio.com uses cookies, Speed Insights, Umami, and Sentry.',
          },
        },
        {
          path: '/privacy',
          component: PrivacyPage,
          meta: {
            title: 'Privacy | RevealUI Studio',
            description:
              'How RevealUI Studio collects, uses, and protects the information you share with us.',
          },
        },
        {
          path: '/terms',
          component: TermsPage,
          meta: {
            title: 'Terms | RevealUI Studio',
            description:
              'The terms that govern your use of revealuistudio.com and our engagement process.',
          },
        },
        {
          path: '/cases',
          component: CasesPage,
          meta: {
            title: 'Engagements | RevealUI Studio',
            description: 'Published only with explicit customer permission.',
            robots: publishedCases.length === 0 ? 'noindex,nofollow' : 'index,follow',
          },
        },
        {
          path: '/cases/:slug',
          component: CaseStudyPage,
          meta: {
            title: 'Engagements | RevealUI Studio',
            description: 'Published only with explicit customer permission.',
            robots: publishedCases.length === 0 ? 'noindex,nofollow' : 'index,follow',
          },
        },
        {
          path: '/press',
          component: PressPage,
          meta: {
            title: 'Press | RevealUI Studio',
            description: 'Public talks and mentions, when they exist.',
            robots: publishedPress.length === 0 ? 'noindex,nofollow' : 'index,follow',
          },
        },
        {
          path: '/press/:slug',
          component: PressItemPage,
          meta: {
            title: 'Press | RevealUI Studio',
            description: 'Public talks and mentions, when they exist.',
            robots: publishedPress.length === 0 ? 'noindex,nofollow' : 'index,follow',
          },
        },
        {
          path: '/*notfound',
          component: NotFoundPage,
          meta: {
            title: '404 | RevealUI Studio',
            description: 'The page you are looking for does not exist or has moved.',
          },
        },
      ]);
    registered.current = true;
  }

  if (shareSlug) {
    return (
      <ErrorBoundary>
        <LinkBehaviorProvider component={Link} hrefProp="to">
          <Routes />
        </LinkBehaviorProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <LinkBehaviorProvider component={Link} hrefProp="to">
        <RootLayout>
          <Routes />
        </RootLayout>
      </LinkBehaviorProvider>
    </ErrorBoundary>
  );
}
