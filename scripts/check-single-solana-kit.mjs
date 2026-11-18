#!/usr/bin/env node
/**
 * One version of the Solana kit and of each Solana program client.
 *
 * A dependency that asks for an older `@solana/kit` brings the whole kit with
 * it (about forty packages), and every app bundle then carries both copies.
 * The lockfile shows it before any build does, so this reads the lockfile.
 * The fix is an entry under `pnpm.overrides` in the root `package.json`,
 * after checking that the dependency only calls functions the current
 * version still has.
 */
import { readFileSync } from 'node:fs';

const lockfile = readFileSync('pnpm-lock.yaml', 'utf8');
const packages = lockfile.slice(lockfile.indexOf('\npackages:'), lockfile.indexOf('\nsnapshots:'));
const versions = new Map();
for (const [, name, version] of packages.matchAll(
  /^ {2}'?(@solana\/kit|@solana-program\/[^@']+)@([^':(]+)'?:$/gm
)) {
  versions.set(name, [...(versions.get(name) ?? []), version]);
}
const duplicates = [...versions].filter(([, list]) => list.length > 1);
for (const [name, list] of duplicates) {
  console.error(`${name} is locked at ${list.join(' and ')}; add a pnpm override.`);
}
process.exit(duplicates.length ? 1 : 0);
