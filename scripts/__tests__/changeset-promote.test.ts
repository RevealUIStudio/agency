import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { changesetPromoteExitCode, pendingChangesetNames } from '../changeset-promote.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('changeset promote gate', () => {
  it('treats only non-README markdown as pending', () => {
    expect(pendingChangesetNames(['README.md', 'config.json', 'book-pay.md'])).toEqual([
      'book-pay.md',
    ]);
  });

  it('allows pending changesets on the way into test', () => {
    expect(changesetPromoteExitCode('test', ['book-pay.md'])).toBe(0);
    expect(changesetPromoteExitCode('', ['book-pay.md'])).toBe(0);
  });

  it('blocks a promote to main while a changeset is unconsumed', () => {
    expect(changesetPromoteExitCode('main', ['README.md', 'book-pay.md'])).toBe(1);
  });

  it('allows a promote to main after changesets are consumed', () => {
    expect(changesetPromoteExitCode('main', ['README.md', 'config.json'])).toBe(0);
  });

  it('is the CI step that runs the promote check', () => {
    const ci = readFileSync(path.join(repoRoot, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).toContain('node scripts/changeset-promote.mjs');
  });
});
