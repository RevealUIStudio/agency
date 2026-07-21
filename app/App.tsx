import { LinkBehaviorProvider } from '@revealui/presentation';
import { Link, Routes, useRouter } from '@revealui/router';
import { useRef } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RootLayout } from './layouts/RootLayout';
import { AboutPage } from './routes/AboutPage';
import { CaseStudyPage } from './routes/CaseStudyPage';
import { CasesPage } from './routes/CasesPage';
import { ContactPage } from './routes/ContactPage';
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
          title: 'RevealUI Studio | We build and deploy the runtime. You keep it.',
          description:
            'For teams with a working agent demo and a production-lift problem. We embed like forward deployed engineers and stamp a customer-owned RevealUI runtime.',
        },
      },
      {
        path: '/services',
        component: ServicesPage,
        meta: {
          title: 'Services | RevealUI Studio',
          description:
            'Productized forward-deploy engagements on the RevealUI runtime: Fleet Stamp, Custom Build, AI Integration, and Architecture Review.',
        },
      },
      {
        path: '/about',
        component: AboutPage,
        meta: {
          title: 'About | RevealUI Studio',
          description:
            'RevealUI Studio is the reference forward-deployed practice on the open-source RevealUI runtime. Ship into your environment, hand over the keys.',
        },
      },
      {
        path: '/contact',
        component: ContactPage,
        meta: {
          title: 'Contact | RevealUI Studio',
          description:
            'Book a discovery call or send us a message. We respond within 1-2 business days.',
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
