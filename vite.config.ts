import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { handleAvailability, handleBook, handleStripeWebhook } from './server/consultation-http';
import { handleShareRequest } from './server/share-http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function requestPath(url: string): string {
  return url.split('?')[0] ?? '';
}

function isSharePath(path: string): boolean {
  return (
    path.startsWith('/share/') ||
    path.startsWith('/api/share/') ||
    path.startsWith('/api/invoice/stage-b') ||
    path === '/api/session'
  );
}

function isConsultationPath(path: string): boolean {
  return (
    path === '/api/consultation/availability' ||
    path === '/api/consultation/book' ||
    path === '/api/stripe/webhook'
  );
}

function shareServer(): Plugin {
  const attach: Plugin['configureServer'] = (server) => {
    server.middlewares.use((req, res, next) => {
      const url = req.url ?? '';
      const path = requestPath(url);
      if (!isSharePath(path) && !isConsultationPath(path)) {
        next();
        return;
      }
      void (async () => {
        try {
          const hostHeader = req.headers.host;
          const host = typeof hostHeader === 'string' ? hostHeader : 'localhost';
          const headers = new Headers();
          headers.set('host', host);
          const proto = req.headers['x-forwarded-proto'];
          if (typeof proto === 'string') headers.set('x-forwarded-proto', proto);
          const authorization = req.headers.authorization;
          if (typeof authorization === 'string') headers.set('authorization', authorization);
          const signature = req.headers['stripe-signature'];
          if (typeof signature === 'string') headers.set('stripe-signature', signature);
          let body: string | undefined;
          if (req.method === 'POST') {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            body = Buffer.concat(chunks).toString('utf8');
          }
          const request = new Request(new URL(url, `http://${host}`), {
            method: req.method,
            headers,
            body: req.method === 'POST' ? body : undefined,
          });
          const response = isConsultationPath(path)
            ? path === '/api/consultation/availability'
              ? await handleAvailability(request)
              : path === '/api/consultation/book'
                ? await handleBook(request)
                : await handleStripeWebhook(request)
            : await handleShareRequest(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch {
          res.statusCode = 500;
          res.end('denied');
        }
      })();
    });
  };
  return {
    name: 'studio-share-server',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

export default defineConfig({
  plugins: [tailwindcss(), react(), shareServer()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app'),
    },
  },
  server: {
    port: 3001,
    open: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  publicDir: 'public',
});
