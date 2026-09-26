import { Link } from '@revealui/router';
import type { ReactNode } from 'react';

export function stripFrontmatter(source: string): string {
  const normalized = source.replaceAll('\r\n', '\n');
  if (!normalized.startsWith('---\n')) return normalized;
  const end = normalized.indexOf('\n---\n', 4);
  if (end === -1) return normalized;
  const body = normalized.slice(end + '\n---\n'.length);
  return body.startsWith('\n') ? body.slice(1) : body;
}

export type BlogBlock =
  | { type: 'heading'; level: 2 | 3 | 4; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'code'; text: string }
  | { type: 'hr' };

function headingFrom(line: string): { level: 2 | 3 | 4; text: string } | null {
  if (line.startsWith('#### ')) return { level: 4, text: line.slice(5) };
  if (line.startsWith('### ')) return { level: 3, text: line.slice(4) };
  if (line.startsWith('## ')) return { level: 2, text: line.slice(3) };
  if (line.startsWith('# ')) return { level: 2, text: line.slice(2) };
  return null;
}

function orderedItem(line: string): string | null {
  let i = 0;
  let ch = line[0];
  if (ch === undefined || ch < '0' || ch > '9') return null;
  while (ch !== undefined && ch >= '0' && ch <= '9') {
    i += 1;
    ch = line[i];
  }
  const next = line[i + 1];
  if (i === 0 || ch !== '.' || next !== ' ') return null;
  return line.slice(i + 2);
}

function unorderedItem(line: string): string | null {
  if (line.startsWith('- ')) return line.slice(2);
  if (line.startsWith('* ')) return line.slice(2);
  return null;
}

function isRule(line: string): boolean {
  return line === '---' || line === '***';
}

export function parseBlogMarkdown(source: string): BlogBlock[] {
  const lines = stripFrontmatter(source).split('\n');
  const blocks: BlogBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.trim() === '') {
      i += 1;
      continue;
    }
    if (line.startsWith('```')) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) {
        code.push(lines[i] ?? '');
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }
    if (isRule(line.trim())) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }
    const heading = headingFrom(line);
    if (heading) {
      blocks.push({ type: 'heading', level: heading.level, text: heading.text });
      i += 1;
      continue;
    }
    if (line.startsWith('> ') || line === '>') {
      const quote: string[] = [];
      while (i < lines.length && ((lines[i] ?? '').startsWith('> ') || lines[i] === '>')) {
        const current = lines[i] ?? '';
        quote.push(current.startsWith('> ') ? current.slice(2) : '');
        i += 1;
      }
      blocks.push({ type: 'quote', text: quote.join(' ') });
      continue;
    }
    const ordered = orderedItem(line);
    if (ordered !== null) {
      const items: string[] = [];
      while (i < lines.length) {
        const item = orderedItem(lines[i] ?? '');
        if (item === null) break;
        items.push(item);
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }
    const unordered = unorderedItem(line);
    if (unordered !== null) {
      const items: string[] = [];
      while (i < lines.length) {
        const item = unorderedItem(lines[i] ?? '');
        if (item === null) break;
        items.push(item);
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }
    const paragraph: string[] = [];
    while (i < lines.length) {
      const current = lines[i] ?? '';
      if (
        current.trim() === '' ||
        current.startsWith('```') ||
        headingFrom(current) ||
        isRule(current.trim()) ||
        current.startsWith('> ') ||
        orderedItem(current) !== null ||
        unorderedItem(current) !== null
      ) {
        break;
      }
      paragraph.push(current);
      i += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

function safeHref(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    if (trimmed.includes(' ') || trimmed.includes('"') || trimmed.includes("'")) return null;
    return trimmed;
  }
  return null;
}

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let buf = '';
  let i = 0;
  let key = 0;
  const flush = () => {
    if (buf.length === 0) return;
    nodes.push(buf);
    buf = '';
  };
  const nextKey = () => {
    key += 1;
    return `${keyPrefix}-${key}`;
  };

  while (i < text.length) {
    if (text.startsWith('**', i)) {
      const close = text.indexOf('**', i + 2);
      if (close !== -1) {
        flush();
        const id = nextKey();
        nodes.push(<strong key={id}>{parseInline(text.slice(i + 2, close), id)}</strong>);
        i = close + 2;
        continue;
      }
    }
    if (text[i] === '`') {
      const close = text.indexOf('`', i + 1);
      if (close !== -1) {
        flush();
        nodes.push(
          <code
            key={nextKey()}
            className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground"
          >
            {text.slice(i + 1, close)}
          </code>,
        );
        i = close + 1;
        continue;
      }
    }
    if (text[i] === '[') {
      const labelEnd = text.indexOf(']', i + 1);
      if (labelEnd !== -1 && text[labelEnd + 1] === '(') {
        const hrefEnd = text.indexOf(')', labelEnd + 2);
        if (hrefEnd !== -1) {
          const href = safeHref(text.slice(labelEnd + 2, hrefEnd));
          if (href) {
            flush();
            const id = nextKey();
            const label = parseInline(text.slice(i + 1, labelEnd), id);
            nodes.push(
              href.startsWith('/') ? (
                <Link key={id} to={href} className="font-semibold text-foreground underline">
                  {label}
                </Link>
              ) : (
                <a
                  key={id}
                  href={href}
                  className="font-semibold text-foreground underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {label}
                </a>
              ),
            );
            i = hrefEnd + 1;
            continue;
          }
        }
      }
    }
    if (text[i] === '*') {
      const close = text.indexOf('*', i + 1);
      if (close > i + 1) {
        flush();
        const id = nextKey();
        nodes.push(<em key={id}>{parseInline(text.slice(i + 1, close), id)}</em>);
        i = close + 1;
        continue;
      }
    }
    buf += text[i] ?? '';
    i += 1;
  }
  flush();
  return nodes;
}

const headingClass = 'mt-10 text-2xl font-bold tracking-tight text-foreground';

export function BlogMarkdown({ source }: { source: string }) {
  const blocks = parseBlogMarkdown(source);
  return (
    <div className="space-y-5 text-base leading-7 text-foreground">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === 'heading') {
          if (block.level === 2) {
            return (
              <h2 key={key} className={headingClass}>
                {parseInline(block.text, key)}
              </h2>
            );
          }
          if (block.level === 3) {
            return (
              <h3 key={key} className="mt-8 text-xl font-bold tracking-tight text-foreground">
                {parseInline(block.text, key)}
              </h3>
            );
          }
          return (
            <h4 key={key} className="mt-6 text-lg font-semibold text-foreground">
              {parseInline(block.text, key)}
            </h4>
          );
        }
        if (block.type === 'ul') {
          return (
            <ul key={key} className="list-disc space-y-2 pl-6">
              {block.items.map((item) => (
                <li key={item}>{parseInline(item, `${key}-${item.slice(0, 24)}`)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={key} className="list-decimal space-y-2 pl-6">
              {block.items.map((item) => (
                <li key={item}>{parseInline(item, `${key}-${item.slice(0, 24)}`)}</li>
              ))}
            </ol>
          );
        }
        if (block.type === 'quote') {
          return (
            <blockquote key={key} className="border-l-2 border-border pl-4 text-muted-foreground">
              {parseInline(block.text, key)}
            </blockquote>
          );
        }
        if (block.type === 'code') {
          return (
            <pre
              key={key}
              className="overflow-x-auto rounded-xl border border-border bg-muted p-4 font-mono text-sm leading-6 text-foreground"
            >
              <code>{block.text}</code>
            </pre>
          );
        }
        if (block.type === 'hr') {
          return <hr key={key} className="border-border" />;
        }
        return <p key={key}>{parseInline(block.text, key)}</p>;
      })}
    </div>
  );
}
