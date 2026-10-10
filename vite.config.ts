import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { STUDIO_BLOG_FEED_PATH } from './app/lib/blog-copy';
import { writeStudioRouteHtml } from './app/lib/route-html';
import { RSS_CONTENT_TYPE, renderStudioRss } from './app/lib/rss';
import { isConsultationDomainHost } from './app/lib/share-host';
import { handleConsultationRequest } from './server/consultation-http';
import { handleShareRequest } from './server/share-http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function shareServer(): Plugin {
  const attach: Plugin['configureServer'] = (server) => {
    server.middlewares.use((req, res, next) => {
      const url = req.url ?? '';
      const pathOnly = url.split('?')[0] ?? '';
      const host = typeof req.headers.host === 'string' ? req.headers.host : 'localhost';
      let requestUrl: URL;
      try {
        requestUrl = new URL(url, `http://${host}`);
      } catch {
        res.statusCode = 400;
        res.end('denied');
        return;
      }
      const customHost = isConsultationDomainHost(requestUrl.hostname);
      const share =
        customHost ||
        pathOnly.startsWith('/share/') ||
        pathOnly.startsWith('/api/share/') ||
        pathOnly === '/api/share' ||
        pathOnly.startsWith('/api/invoice/stage-b') ||
        pathOnly === '/api/session';
      const consultation =
        !customHost &&
        (url.startsWith('/api/consultation/') || url.startsWith('/api/stripe/webhook'));
      if (!share && !consultation) {
        next();
        return;
      }
      void (async () => {
        try {
          const headers = new Headers();
          headers.set('host', host);
          const authorization = req.headers.authorization;
          if (typeof authorization === 'string') headers.set('authorization', authorization);
          // Socket peer for the consultation throttle. Do not copy
          // x-forwarded-for from the caller. That header is spoofable here.
          const peer = req.socket?.remoteAddress;
          if (typeof peer === 'string' && peer.trim() !== '') {
            headers.set('x-real-ip', peer.trim());
          }
          let body: string | undefined;
          if (req.method === 'POST') {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            body = Buffer.concat(chunks).toString('utf8');
          }
          const request = new Request(requestUrl, {
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

function routeHtml(): Plugin {
  return {
    name: 'studio-route-html',
    apply: 'build',
    writeBundle(options) {
      if (!options.dir) {
        throw new Error('Route HTML build is missing an output directory');
      }
      writeStudioRouteHtml(options.dir);
    },
  };
}

function rssFeed(): Plugin {
  const attach: Plugin['configureServer'] = (server) => {
    server.middlewares.use((req, res, next) => {
      const pathOnly = (req.url ?? '').split('?')[0] ?? '';
      if (pathOnly === '/feed.xml') {
        res.statusCode = 301;
        res.setHeader('Location', STUDIO_BLOG_FEED_PATH);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('');
        return;
      }
      if (pathOnly !== STUDIO_BLOG_FEED_PATH) {
        next();
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', RSS_CONTENT_TYPE);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.end(renderStudioRss());
    });
  };

  return {
    name: 'studio-rss-feed',
    configureServer: attach,
    configurePreviewServer: attach,
    writeBundle(options) {
      if (!options.dir) {
        throw new Error('Blog feed build is missing an output directory');
      }
      writeFileSync(path.join(options.dir, 'rss.xml'), renderStudioRss(), 'utf8');
    },
  };
}

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
    'process.env.LOG_LEVEL': 'undefined',
  },
  plugins: [tailwindcss(), react(), shareServer(), rssFeed(), routeHtml()],
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
