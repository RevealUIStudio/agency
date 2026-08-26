#!/usr/bin/env node
/**
 * Vercel ignored-build-step. Exit 0 skips the deployment; exit 1 continues it.
 * Allowlist is the only refs that should spend Vercel quota (production + staging).
 * A missing git ref proceeds so a dashboard/manual deploy cannot skip by accident.
 */
import { pathToFileURL } from 'node:url';

export const VERCEL_BUILD_REFS = Object.freeze(['main', 'test']);

export function vercelIgnoredBuildExitCode(ref = process.env.VERCEL_GIT_COMMIT_REF ?? '') {
  if (ref === '' || VERCEL_BUILD_REFS.includes(ref)) return 1;
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(vercelIgnoredBuildExitCode());
}
