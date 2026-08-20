import { LinkBehaviorProvider } from '@revealui/presentation';
import { Link, Routes, useRouter } from '@revealui/router';
import { useRef } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
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
          title: 'RevealUI Studio | Working session, written plan, launch package',
          description:
            'A Maryville, Tennessee studio. Three paid offers: a $300 working session, a $3,500 written plan, or a $7,500 launch package. Book a 30-minute intro. No account, no payment.',
        },
      },
      {
        path: '/services',
        component: ServicesPage,
        meta: {
          title: 'Offers | RevealUI Studio',
          description:
            'Working session $300. Written plan $3,500. Launch package $7,500. Invoice after we book. Book a 30-minute intro first.',
        },
      },
      {
        path: '/pricing',
        component: ServicesPage,
        meta: {
          title: 'Offers | RevealUI Studio',
          description:
            'Working session $300. Written plan $3,500. Launch package $7,500. Invoice after we book. Book a 30-minute intro first.',
        },
      },
      {
        path: '/products',
        component: ServicesPage,
        meta: {
          title: 'Offers | RevealUI Studio',
          description:
            'Working session $300. Written plan $3,500. Launch package $7,500. Invoice after we book. Book a 30-minute intro first.',
        },
      },
      {
        path: '/catalog',
        component: ServicesPage,
        meta: {
          title: 'Offers | RevealUI Studio',
          description:
            'Working session $300. Written plan $3,500. Launch package $7,500. Invoice after we book. Book a 30-minute intro first.',
        },
      },
      {
        path: '/about',
        component: AboutPage,
        meta: {
          title: 'About | RevealUI Studio',
          description:
            'RevealUI Studio is a one-person software studio in Maryville, Tennessee. Joshua Vaughn. Three paid offers. Invoice after we book.',
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
          description:
            'Engagements and case studies from RevealUI Studio, published only with explicit customer permission.',
        },
      },
      {
        path: '/cases/:slug',
        component: CaseStudyPage,
        meta: {
          title: 'Case study | RevealUI Studio',
          description:
            'Engagements and case studies from RevealUI Studio, published only with explicit customer permission.',
        },
      },
      {
        path: '/press',
        component: PressPage,
        meta: {
          title: 'Press | RevealUI Studio',
          description:
            'Public talks, podcast appearances, and press mentions from Joshua Vaughn and RevealUI Studio.',
        },
      },
      {
        path: '/press/:slug',
        component: PressItemPage,
        meta: {
          title: 'Press | RevealUI Studio',
          description:
            'Public talks, podcast appearances, and press mentions from Joshua Vaughn and RevealUI Studio.',
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
