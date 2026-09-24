#!/usr/bin/env node
/**
 * Pending changesets may land on test with the feature.
 * A pull request into main must already have consumed them
 * (`pnpm changeset:version`). Exit 0 passes. Exit 1 blocks.
 */
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function pendingChangesetNames(fileNames) {
  return fileNames.filter((name) => name.endsWith('.md') && name !== 'README.md');
}

export function changesetPromoteExitCode(baseRef, fileNames) {
  if (baseRef !== 'main') return 0;
  return pendingChangesetNames(fileNames).length === 0 ? 0 : 1;
}

function changesetDir() {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.changeset');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const baseRef = process.env.GITHUB_BASE_REF ?? '';
  let names = [];
  try {
    names = readdirSync(changesetDir());
  } catch {
    names = [];
  }
  const code = changesetPromoteExitCode(baseRef, names);
  if (code !== 0) {
    for (const name of pendingChangesetNames(names)) {
      console.error(`pending changeset: ${name}`);
    }
    console.error(
      'Run pnpm changeset:version and commit the result before promoting test to main.',
    );
  }
  process.exit(code);
}
