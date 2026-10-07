import { LinkBehaviorProvider } from '@revealui/presentation';
import { Link, Routes, useRouter } from '@revealui/router';
import { useRef } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PROOF_GAP_PATH } from './content/proof-gap';
import { RootLayout } from './layouts/RootLayout';
import { routeMeta } from './lib/route-documents';
import { clientSlugFromHost } from './lib/share-host';
import { AboutPage } from './routes/AboutPage';
import { BlogPage } from './routes/BlogPage';
import { BlogPostPage } from './routes/BlogPostPage';
import { CaseStudyPage } from './routes/CaseStudyPage';
import { CasesPage } from './routes/CasesPage';
import {
  ConsultationBookCancelPage,
  ConsultationBookPage,
  ConsultationBookSuccessPage,
} from './routes/ConsultationBookPage';
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
        { path: '/', component: HomePage, meta: routeMeta('/') },
        { path: '/services', component: ServicesPage, meta: routeMeta('/services') },
        { path: '/pricing', component: RedirectToCalculator, meta: routeMeta('/pricing') },
        { path: '/products', component: RedirectToCalculator, meta: routeMeta('/products') },
        { path: '/catalog', component: RedirectToCalculator, meta: routeMeta('/catalog') },
        { path: '/process', component: ProcessPage, meta: routeMeta('/process') },
        { path: '/blog', component: BlogPage, meta: routeMeta('/blog') },
        { path: '/blog/:slug', component: BlogPostPage, meta: routeMeta('/blog') },
        { path: '/about', component: AboutPage, meta: routeMeta('/about') },
        {
          path: '/consultation/book',
          component: ConsultationBookPage,
          meta: routeMeta('/consultation/book'),
        },
        {
          path: '/consultation/book/success',
          component: ConsultationBookSuccessPage,
          meta: routeMeta('/consultation/book/success'),
        },
        {
          path: '/consultation/book/cancel',
          component: ConsultationBookCancelPage,
          meta: routeMeta('/consultation/book/cancel'),
        },
        { path: '/contact', component: ContactPage, meta: routeMeta('/contact') },
        { path: PROOF_GAP_PATH, component: ProofGapPage, meta: routeMeta(PROOF_GAP_PATH) },
        { path: '/cookies', component: CookiesPage, meta: routeMeta('/cookies') },
        { path: '/privacy', component: PrivacyPage, meta: routeMeta('/privacy') },
        { path: '/terms', component: TermsPage, meta: routeMeta('/terms') },
        { path: '/cases', component: CasesPage, meta: routeMeta('/cases') },
        { path: '/cases/:slug', component: CaseStudyPage, meta: routeMeta('/cases') },
        { path: '/press', component: PressPage, meta: routeMeta('/press') },
        { path: '/press/:slug', component: PressItemPage, meta: routeMeta('/press') },
        { path: '/*notfound', component: NotFoundPage, meta: routeMeta('/__not-found__') },
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
