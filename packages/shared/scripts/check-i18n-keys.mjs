/**
 * i18n key parity check.
 *
 * For each locale group, flattens the reference locale (English) and every
 * other locale to dot-notation keys and reports:
 *   - MISSING: keys present in the reference but absent in a locale (hard fail)
 *   - EXTRA:   keys present in a locale but not in the reference (warning)
 *
 * Exits non-zero if any locale is missing reference keys, so it can gate CI.
 * No dependencies — plain Node ESM.
 *
 * Run: pnpm --filter @salmon/shared i18n:check
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const sharedRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(sharedRoot, '..', '..');

/** Locale groups to check: a reference file + the other locales to compare. */
const GROUPS = [
  {
    name: 'shared/translation',
    ref: { code: 'en', file: path.join(sharedRoot, 'src/locales/en/translation.json') },
    others: [{ code: 'es', file: path.join(sharedRoot, 'src/locales/es/translation.json') }],
  },
  {
    name: 'extension/_locales',
    ref: {
      code: 'en',
      file: path.join(repoRoot, 'apps/extension/public/_locales/en/messages.json'),
    },
    others: [
      { code: 'es', file: path.join(repoRoot, 'apps/extension/public/_locales/es/messages.json') },
    ],
  },
];

/** Flatten a nested object to a sorted set of dot-notation leaf keys. */
function flatten(obj, prefix = '', out = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, full, out);
    } else {
      out.add(full);
    }
  }
  return out;
}

function readKeys(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return flatten(JSON.parse(raw));
}

let failed = false;

for (const group of GROUPS) {
  if (!fs.existsSync(group.ref.file)) {
    console.log(`\n• ${group.name}: reference file not found, skipping`);
    continue;
  }
  const refKeys = readKeys(group.ref.file);
  console.log(`\n• ${group.name} — reference ${group.ref.code}: ${refKeys.size} keys`);

  for (const other of group.others) {
    if (!fs.existsSync(other.file)) {
      console.log(`  ✕ ${other.code}: file not found (${path.relative(repoRoot, other.file)})`);
      failed = true;
      continue;
    }
    const keys = readKeys(other.file);
    const missing = [...refKeys].filter((k) => !keys.has(k)).sort();
    const extra = [...keys].filter((k) => !refKeys.has(k)).sort();

    if (!missing.length && !extra.length) {
      console.log(`  ✓ ${other.code}: in sync (${keys.size} keys)`);
      continue;
    }
    if (missing.length) {
      failed = true;
      console.log(`  ✕ ${other.code}: ${missing.length} MISSING key(s):`);
      for (const k of missing) console.log(`      - ${k}`);
    }
    if (extra.length) {
      console.log(`  ⚠ ${other.code}: ${extra.length} EXTRA key(s) (not in ${group.ref.code}):`);
      for (const k of extra) console.log(`      + ${k}`);
    }
  }
}

if (failed) {
  console.error('\ni18n check FAILED — some locales are missing reference keys.\n');
  process.exit(1);
}
console.log('\ni18n check passed — all locales in sync.\n');
