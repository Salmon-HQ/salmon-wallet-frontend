#!/usr/bin/env node
/**
 * check-powerups-bundle — a build with Powerups off carries no Powerup
 * (spec 027 §3).
 *
 * The flag is a bundler alias, not a runtime `if`: with `VITE_POWERUPS=off`
 * (extension) / `EXPO_PUBLIC_POWERUPS=off` (mobile) every Powerups entry
 * resolves to its empty twin, so the swap code, its copy and its endpoint
 * must be absent from the output. This greps a built bundle for markers that
 * exist only inside `powerups/**` and fails when one is found.
 *
 * Usage: node scripts/check-powerups-bundle.mjs <dist dir> [--expect-present]
 *   --expect-present inverts the check, for a build with Powerups ON: every
 *   marker must be present, which is what proves the markers still mean
 *   something.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Strings that exist only in the Powerup module graph and its locales. ASCII
 * on purpose: the bundler escapes non-ASCII copy, and the attribution
 * ("Powered by 0x") arrives from the backend at runtime, never in code.
 */
const MARKERS = ['ft/swap/build', 'swap.catalog', 'Swap Review', 'Tolerancia de Deslizamiento'];

const [, , dir, ...flags] = process.argv;
if (!dir) {
  console.error('usage: node scripts/check-powerups-bundle.mjs <dist dir> [--expect-present]');
  process.exit(2);
}
const expectPresent = flags.includes('--expect-present');

function walk(root, out = []) {
  for (const name of readdirSync(root)) {
    const p = join(root, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|mjs|cjs|hbc|bundle|html|json)$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(dir);
const found = new Map();
for (const file of files) {
  const src = readFileSync(file, 'latin1');
  for (const marker of MARKERS) {
    if (src.includes(marker)) {
      if (!found.has(marker)) found.set(marker, []);
      found.get(marker).push(file);
    }
  }
}

if (expectPresent) {
  const missing = MARKERS.filter((marker) => !found.has(marker));
  if (missing.length > 0) {
    console.error(`FAIL Powerups ON build is missing markers: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log(`powerups-bundle: ${files.length} files, every marker present (Powerups on)`);
  process.exit(0);
}

if (found.size > 0) {
  console.error('FAIL Powerups OFF build still carries Powerup code or copy:');
  for (const [marker, where] of found) console.error(`  "${marker}" in ${where.join(', ')}`);
  process.exit(1);
}
console.log(`powerups-bundle: ${files.length} files, no Powerup marker (Powerups off)`);
