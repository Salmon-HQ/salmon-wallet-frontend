/**
 * Global setup: the preflight. Every check here is a prerequisite whose
 * absence would otherwise surface minutes later as a selector failure, so
 * each one stops the run at once and names what is missing.
 *
 * Backend reachability is checked per-spec (specs skip when salmon-api is
 * down, per the repo e2e policy), not here.
 */
import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { EXT_DIST, loadTestEnv, requireSecrets } from './env';

const repoRoot = path.resolve(EXT_DIST, '../../../..');
/** What the extension bundle is built from. */
const SOURCES = ['apps/extension/src', 'packages/ui/src', 'packages/shared/src'];

function newestSourceMtime(): { file: string; mtimeMs: number } {
  let newest = { file: '', mtimeMs: 0 };
  for (const base of SOURCES) {
    const dir = path.join(repoRoot, base);
    for (const rel of fs.readdirSync(dir, { recursive: true, encoding: 'utf8' })) {
      if (!/\.(ts|tsx|js|json|css)$/.test(rel)) continue;
      const { mtimeMs } = fs.statSync(path.join(dir, rel));
      if (mtimeMs > newest.mtimeMs) newest = { file: path.join(base, rel), mtimeMs };
    }
  }
  return newest;
}

/** The specs load the built bundle: an absent or stale one tests old code. */
function requireFreshBuild(): void {
  const manifest = path.join(EXT_DIST, 'manifest.json');
  if (!fs.existsSync(manifest)) {
    throw new Error(`No extension build at ${EXT_DIST}. Run: pnpm --filter @salmon/extension build`);
  }
  const built = fs.statSync(manifest).mtimeMs;
  const newest = newestSourceMtime();
  if (newest.mtimeMs > built) {
    throw new Error(
      `The extension build is older than ${newest.file}. Run: pnpm --filter @salmon/extension build`
    );
  }
}

/** The bundled Chromium for this Playwright version, not whatever is on disk. */
function requireChromium(): void {
  const executable = chromium.executablePath();
  if (!fs.existsSync(executable)) {
    throw new Error(
      `Chromium for this Playwright version is not installed (${executable}). ` +
        'Run: npx playwright install chromium'
    );
  }
}

/**
 * Every spec that sends or views funds or NFTs does it on devnet. This script
 * keeps Wallet A funded and holding the NFT fixture, and stops the run when
 * Wallet B needs the faucet. It reads the secrets from the environment this
 * setup loaded — never from argv.
 */
function ensureDevnetFixtures(): void {
  const result = spawnSync(process.execPath, [path.join(repoRoot, 'scripts/devnet-fixtures.cjs')], {
    env: process.env,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || 'devnet fixtures failed');
  }
  console.log(result.stdout.trim());
}

export default function globalSetup(): void {
  loadTestEnv();
  requireSecrets([
    'SALMON_TEST_PASSWORD',
    'SALMON_TEST_SEED_B',
    'SALMON_TEST_WALLET_A_ADDR',
    'SALMON_TEST_WALLET_B_ADDR',
  ]);
  requireFreshBuild();
  requireChromium();
  ensureDevnetFixtures();
}
