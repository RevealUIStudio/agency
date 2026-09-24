import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { handleConsultationRequest } from './server/consultation-http';
import { handleShareRequest } from './server/share-http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function shareServer(): Plugin {
  const attach: Plugin['configureServer'] = (server) => {
    server.middlewares.use((req, res, next) => {
      const url = req.url ?? '';
      const share =
        url.startsWith('/share/') ||
        url.startsWith('/api/share/') ||
        url.startsWith('/api/invoice/stage-b') ||
        url === '/api/session' ||
        url.startsWith('/api/session?');
      const consultation =
        url.startsWith('/api/consultation/') || url.startsWith('/api/stripe/webhook');
      if (!share && !consultation) {
        next();
        return;
      }
      void (async () => {
        try {
          const hostHeader = req.headers.host;
          const host = typeof hostHeader === 'string' ? hostHeader : 'localhost';
          const headers = new Headers();
          headers.set('host', host);
          const authorization = req.headers.authorization;
          if (typeof authorization === 'string') headers.set('authorization', authorization);
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
          const response = consultation
            ? await handleConsultationRequest(request)
            : await handleShareRequest(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch {
          if (consultation) {
            res.statusCode = 500;
            res.setHeader('content-type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'server' }));
            return;
          }
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
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
    'process.env.LOG_LEVEL': 'undefined',
  },
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
