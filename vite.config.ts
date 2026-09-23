import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { handleShareRequest } from './server/share-http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function shareServer(): Plugin {
  const attach: Plugin['configureServer'] = (server) => {
    server.middlewares.use((req, res, next) => {
      const url = req.url ?? '';
      const handled =
        url.startsWith('/share/') ||
        url.startsWith('/api/share/') ||
        url.startsWith('/api/invoice/stage-b') ||
        url === '/api/session' ||
        url.startsWith('/api/session?');
      if (!handled) {
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
          const response = await handleShareRequest(request);
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
