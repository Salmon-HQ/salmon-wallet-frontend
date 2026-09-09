#!/usr/bin/env node
// Extension permissions gate: the built Chrome manifest must ask for exactly
// the permissions recorded in apps/extension/manifest-permissions.json.
//
// A permission that appears in a release makes Chrome disable the extension
// for every user until they accept the new prompt — and for a wallet, a new
// host permission is also a new place funds-related traffic can go. Neither
// should slip in with a dependency bump or a config edit; the baseline makes
// the change a deliberate, reviewable line in the diff.
//
// Runs after `wxt build` (CI does both). `--write` records the current set.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILT = path.join(REPO, 'apps/extension/dist/chrome-mv3/manifest.json');
const BASELINE = path.join(REPO, 'apps/extension/manifest-permissions.json');

if (!fs.existsSync(BUILT)) {
  console.error(
    `check:manifest: ${path.relative(REPO, BUILT)} not found — build the extension first`
  );
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(BUILT, 'utf8'));
const current = {
  permissions: [...(manifest.permissions ?? [])].sort(),
  host_permissions: [...(manifest.host_permissions ?? [])].sort(),
};

if (process.argv.includes('--write')) {
  fs.writeFileSync(BASELINE, `${JSON.stringify(current, null, 2)}\n`);
  // Laid out by prettier, so the file passes format:check as written.
  execFileSync('pnpm', ['exec', 'prettier', '--write', BASELINE], { cwd: REPO, stdio: 'ignore' });
  console.log(`check:manifest: baseline written (${path.relative(REPO, BASELINE)})`);
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const diff = [];
for (const key of ['permissions', 'host_permissions']) {
  const was = new Set(baseline[key] ?? []);
  const now = new Set(current[key]);
  for (const entry of now) if (!was.has(entry)) diff.push(`+ ${key}: ${entry}`);
  for (const entry of was) if (!now.has(entry)) diff.push(`- ${key}: ${entry}`);
}

if (diff.length > 0) {
  console.error(
    'check:manifest: the built manifest asks for a different set of permissions than the baseline:\n'
  );
  for (const line of diff) console.error(`  ${line}`);
  console.error(
    '\nIf this is intended, say so in the PR and refresh the baseline: pnpm check:manifest --write. Chrome will disable the extension for every user until they accept a new permission.'
  );
  process.exit(1);
}
console.log('check:manifest: permissions match the baseline');
