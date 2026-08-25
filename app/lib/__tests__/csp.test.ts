import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

type Header = { key: string; value: string };
type HeaderRule = { source: string; headers: Header[] };

function siteCsp(): string {
  const vercel = JSON.parse(readFileSync(path.join(repoRoot, 'vercel.json'), 'utf8')) as {
    headers: HeaderRule[];
  };
  const site = vercel.headers.find((rule) => rule.source === '/(.*)');
  const csp = site?.headers.find((header) => header.key === 'Content-Security-Policy');
  if (!csp) throw new Error('vercel.json is missing the site Content-Security-Policy');
  return csp.value;
}

function directive(csp: string, name: string): string | undefined {
  return csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `));
}

describe('Speed Insights CSP', () => {
  it('allows the consented Speed Insights script host without widening eval or workers', () => {
    const csp = siteCsp();
    const scriptSrc = directive(csp, 'script-src');
    const connectSrc = directive(csp, 'connect-src');
    const workerSrc = directive(csp, 'worker-src');

    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).toContain('https://va.vercel-scripts.com');
    expect(scriptSrc).not.toContain('unsafe-eval');
    expect(connectSrc).toContain('https://vitals.vercel-insights.com');
    expect(connectSrc).not.toContain('va.vercel-scripts.com');
    expect(workerSrc).toBeUndefined();
  });
});
