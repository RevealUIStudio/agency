import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './index.css';

import { Router, RouterProvider } from '@revealui/router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { CookieConsent } from './components/CookieConsent';
import { initSentry } from './lib/sentry';

// Initialise Sentry before mounting. No-op if VITE_SENTRY_DSN is absent
// or analytics consent has not been granted (returning visitors with the
// consent cookie initialise here; first-time accept goes through SentryTracker).
initSentry();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

export const router = new Router();
router.initClient();

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router}>
      <App />
      <CookieConsent />
    </RouterProvider>
  </StrictMode>,
);
