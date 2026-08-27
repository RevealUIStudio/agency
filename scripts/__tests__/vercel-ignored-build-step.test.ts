import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { VERCEL_BUILD_REFS, vercelIgnoredBuildExitCode } from '../vercel-ignored-build-step.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const scriptPath = path.join(repoRoot, 'scripts/vercel-ignored-build-step.mjs');

function runIgnoreCommand(ref: string): number {
  try {
    execFileSync(process.execPath, [scriptPath], {
      env: { ...process.env, VERCEL_GIT_COMMIT_REF: ref },
      stdio: 'ignore',
    });
    return 0;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (typeof status === 'number') return status;
    throw error;
  }
}

describe('Vercel ignored-build-step', () => {
  it('builds only the allowlisted production and staging refs', () => {
    expect([...VERCEL_BUILD_REFS]).toEqual(['main', 'test']);
    expect(vercelIgnoredBuildExitCode('main')).toBe(1);
    expect(vercelIgnoredBuildExitCode('test')).toBe(1);
  });

  it('skips agent, backflow, and any other git ref', () => {
    expect(vercelIgnoredBuildExitCode('cursor/vercel-ignore-command-921f')).toBe(0);
    expect(vercelIgnoredBuildExitCode('chore/backflow-main-into-test')).toBe(0);
    expect(vercelIgnoredBuildExitCode('feat/anything')).toBe(0);
  });

  it('proceeds when the git ref is missing so a manual deploy cannot skip', () => {
    expect(vercelIgnoredBuildExitCode('')).toBe(1);
  });

  it('is the ignoreCommand vercel.json actually runs', () => {
    const vercel = JSON.parse(readFileSync(path.join(repoRoot, 'vercel.json'), 'utf8')) as {
      ignoreCommand?: string;
    };
    expect(vercel.ignoreCommand).toBe('node scripts/vercel-ignored-build-step.mjs');
  });

  it('exits 1 for main/test and 0 for other refs when invoked as the CLI', () => {
    expect(runIgnoreCommand('main')).toBe(1);
    expect(runIgnoreCommand('test')).toBe(1);
    expect(runIgnoreCommand('cursor/agent-branch')).toBe(0);
  });
});
