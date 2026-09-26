import '@testing-library/jest-dom/vitest';
import { Router, RouterProvider } from '@revealui/router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BlogMarkdown, parseBlogMarkdown, stripFrontmatter } from '@/lib/blog-markdown';

afterEach(cleanup);

function renderMarkdown(source: string) {
  const router = new Router();
  router.registerRoutes([{ path: '/', component: () => null }]);
  window.history.pushState({}, '', '/');
  return render(
    <RouterProvider router={router}>
      <BlogMarkdown source={source} />
    </RouterProvider>,
  );
}

describe('blog markdown', () => {
  it('drops frontmatter before the essay body', () => {
    const body = stripFrontmatter('---\ntitle: "Hidden"\n---\n\nVisible paragraph.');
    expect(body).toBe('Visible paragraph.');
    expect(body).not.toContain('title:');
  });

  it('parses headings, lists, code, and a rule', () => {
    const blocks = parseBlogMarkdown(
      [
        '## Section',
        '',
        '- one',
        '- two',
        '',
        '1. first',
        '',
        '```',
        'const n = 1;',
        '```',
        '',
        '---',
      ].join('\n'),
    );
    expect(blocks.map((block) => block.type)).toEqual(['heading', 'ul', 'ol', 'code', 'hr']);
  });

  it('renders emphasis and refuses a javascript link', () => {
    renderMarkdown(
      'See **Pilot** and *ownership*. [Bad](javascript:alert(1)) [Docs](https://docs.revealui.com).',
    );
    expect(screen.getByText('Pilot').tagName).toBe('STRONG');
    expect(screen.getByText('ownership').tagName).toBe('EM');
    expect(screen.queryByRole('link', { name: 'Bad' })).not.toBeInTheDocument();
    const docs = screen.getByRole('link', { name: 'Docs' });
    expect(docs).toHaveAttribute('href', 'https://docs.revealui.com');
    expect(docs).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
