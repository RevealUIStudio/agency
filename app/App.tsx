import { LinkBehaviorProvider } from '@revealui/presentation';
import { Link, Routes, useRouter } from '@revealui/router';
import { useRef } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RootLayout } from './layouts/RootLayout';
import { AboutPage } from './routes/AboutPage';
import { CasesPage } from './routes/CasesPage';
import { CaseStudyPage } from './routes/CaseStudyPage';
import { PressItemPage } from './routes/PressItemPage';
import { PressPage } from './routes/PressPage';
import { ContactPage } from './routes/ContactPage';
import { HomePage } from './routes/HomePage';
import { NotFoundPage } from './routes/NotFoundPage';
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
        meta: { title: 'RevealUI Studio | We build agent-first business systems' },
      },
      {
        path: '/services',
        component: ServicesPage,
        meta: { title: 'Services | RevealUI Studio' },
      },
      { path: '/about', component: AboutPage, meta: { title: 'About | RevealUI Studio' } },
      { path: '/contact', component: ContactPage, meta: { title: 'Contact | RevealUI Studio' } },
      { path: '/privacy', component: PrivacyPage, meta: { title: 'Privacy | RevealUI Studio' } },
      { path: '/terms', component: TermsPage, meta: { title: 'Terms | RevealUI Studio' } },
      { path: '/cases', component: CasesPage, meta: { title: 'Engagements | RevealUI Studio' } },
      {
        path: '/cases/:slug',
        component: CaseStudyPage,
        meta: { title: 'Case study | RevealUI Studio' },
      },
      { path: '/press', component: PressPage, meta: { title: 'Press | RevealUI Studio' } },
      {
        path: '/press/:slug',
        component: PressItemPage,
        meta: { title: 'Press | RevealUI Studio' },
      },
      { path: '/*notfound', component: NotFoundPage, meta: { title: '404 | RevealUI Studio' } },
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
