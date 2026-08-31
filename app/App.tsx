import { LinkBehaviorProvider } from '@revealui/presentation';
import { Link, Routes, useRouter } from '@revealui/router';
import { useRef } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { publishedCases } from './data/cases';
import { publishedPress } from './data/press';
import { RootLayout } from './layouts/RootLayout';
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
import { RedirectToCalculator } from './routes/RedirectToCalculator';
import { ServicesPage } from './routes/ServicesPage';
import { TermsPage } from './routes/TermsPage';

export function App() {
  const router = useRouter();
  const registered = useRef(false);

  if (!registered.current && router.getRoutes().length === 0) {
    router.registerRoutes([
      {
        path: '/',
        component: HomePage,
        meta: {
          title: 'RevealUI Studio | Product studio for runtime, receipts, and live launch',
          description:
            'A product studio. Hour $300. Architecture artifact bundle and review $3,500. Launch $7,500. Remote first. Book a 30-minute intro on Google Calendar.',
        },
      },
      {
        path: '/services',
        component: ServicesPage,
        meta: {
          title: 'Offers | RevealUI Studio',
          description:
            'Hour $300. Architecture artifact bundle and review $3,500. Launch $7,500. Invoice after we book. Book a 30-minute intro first.',
        },
      },
      {
        path: '/pricing',
        component: RedirectToCalculator,
        meta: {
          title: 'Quote | RevealUI Studio',
          description:
            'Three questions, a quote. Hour $300. Architecture artifact bundle and review $3,500. Launch $7,500.',
          robots: 'noindex,follow',
        },
      },
      {
        path: '/products',
        component: RedirectToCalculator,
        meta: {
          title: 'Quote | RevealUI Studio',
          description:
            'Three questions, a quote. Hour $300. Architecture artifact bundle and review $3,500. Launch $7,500.',
          robots: 'noindex,follow',
        },
      },
      {
        path: '/catalog',
        component: RedirectToCalculator,
        meta: {
          title: 'Quote | RevealUI Studio',
          description:
            'Three questions, a quote. Hour $300. Architecture artifact bundle and review $3,500. Launch $7,500.',
          robots: 'noindex,follow',
        },
      },
      {
        path: '/process',
        component: ProcessPage,
        meta: {
          title: 'How we work | RevealUI Studio',
          description:
            'How a RevealUI Studio engagement runs. Hour $300. Architecture artifact bundle and review $3,500. Launch $7,500. Book a 30-minute intro on Google Calendar.',
        },
      },
      {
        path: '/about',
        component: AboutPage,
        meta: {
          title: 'About | RevealUI Studio',
          description:
            'RevealUI Studio is a product studio. Joshua Vaughn runs it. A focused hour, an architecture artifact bundle and review, and a live launch. Remote first. Invoice after we agree.',
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
        path: '/cookies',
        component: CookiesPage,
        meta: {
          title: 'Cookies | RevealUI Studio',
          description: 'How revealuistudio.com uses cookies and Speed Insights.',
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
