#!/usr/bin/env node
// i18n check: fails on en/es parity breaks, on literal t('key') calls
// referencing keys that do not exist, and on definite orphans (defined keys
// with no literal, indirect, or dynamic-prefix reference in source).
// "Possibly dynamic" keys (quoted anywhere, or matching a dynamic prefix)
// never fail. Run with --prune to delete definite orphans from both locales.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(REPO, p), 'utf8'));

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

const enKeys = new Set(Object.keys(flatten(readJson('packages/shared/src/locales/en/translation.json'))));
const esKeys = new Set(Object.keys(flatten(readJson('packages/shared/src/locales/es/translation.json'))));
const enMissingFromEs = [...enKeys].filter((k) => !esKeys.has(k)).sort();
const esMissingFromEn = [...esKeys].filter((k) => !enKeys.has(k)).sort();

// Extension _locales parity (chrome extension format, flat)
const extEn = readJson('apps/extension/public/_locales/en/messages.json');
const extEs = readJson('apps/extension/public/_locales/es/messages.json');
const extEnMissingFromEs = Object.keys(extEn).filter((k) => !(k in extEs)).sort();
const extEsMissingFromEn = Object.keys(extEs).filter((k) => !(k in extEn)).sort();

// ---- collect source files ----
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage', 'build']);
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}
const files = [...walk(path.join(REPO, 'apps')), ...walk(path.join(REPO, 'packages'))];

// ---- extract used keys ----
// literal: t('a.b'), i18nKey="a.b", labelKey: 'a.b', ...
// dynamic: t(`prefix.${x}`), t('prefix.' + x) -> prefix
const literalUses = new Map(); // key -> [file:line]
const dynamicPrefixes = new Set();

const patterns = [
  { re: /(?<![\w$.])(?:i18n\.)?t\(\s*'([^']+)'/g, kind: 'lit' },
  { re: /(?<![\w$.])(?:i18n\.)?t\(\s*"([^"]+)"/g, kind: 'lit' },
  { re: /(?<![\w$.])(?:i18n\.)?t\(\s*`([^`]*?)\$\{[^}]*\}[^`]*`/g, kind: 'dyn' },
  { re: /(?<![\w$.])(?:i18n\.)?t\(\s*'([^']*)'\s*\+/g, kind: 'dyn' },
  { re: /(?<![\w$.])(?:i18n\.)?t\(\s*"([^"]*)"\s*\+/g, kind: 'dyn' },
  { re: /(?<![\w$.])(?:i18n\.)?t\(\s*`([^`$]+)`\s*[,)]/g, kind: 'lit' },
  { re: /i18nKey\s*[=:]\s*\{?\s*['"`]([^'"`]+)['"`]/g, kind: 'lit' },
  { re: /labelKey\s*[=:]\s*\{?\s*['"`]([^'"`]+)['"`]/g, kind: 'lit' },
  { re: /titleKey\s*[=:]\s*\{?\s*['"`]([^'"`]+)['"`]/g, kind: 'lit' },
  { re: /descriptionKey\s*[=:]\s*\{?\s*['"`]([^'"`]+)['"`]/g, kind: 'lit' },
  { re: /messageKey\s*[=:]\s*\{?\s*['"`]([^'"`]+)['"`]/g, kind: 'lit' },
  { re: /placeholderKey\s*[=:]\s*\{?\s*['"`]([^'"`]+)['"`]/g, kind: 'lit' },
];

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const lineAt = (idx) => src.slice(0, idx).split('\n').length;
  for (const { re, kind } of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      if (kind === 'lit') {
        const key = m[1];
        if (!literalUses.has(key)) literalUses.set(key, []);
        literalUses.get(key).push(`${path.relative(REPO, f)}:${lineAt(m.index)}`);
      } else {
        dynamicPrefixes.add(m[1]);
      }
    }
  }
}

// i18next plural suffixes: use of "foo" matches defined "foo_one", "foo_other", etc.
const SUFFIX_RE = /_(one|other|two|few|many|zero|plural)$/;
const baseKey = (k) => k.replace(SUFFIX_RE, '');
const enBases = new Set([...enKeys].map(baseKey));

// ---- missing keys (FAIL): literal uses not defined in en ----
const missing = [];
for (const [key, locs] of [...literalUses.entries()].sort()) {
  if (enKeys.has(key) || enBases.has(key)) continue;
  if (key.endsWith('.') || dynamicPrefixes.has(key)) continue; // concat prefix artifact
  if (!key.includes('.')) continue; // raw label, not a key
  // parent namespace used with returnObjects
  if ([...enKeys].some((k) => k.startsWith(key + '.'))) continue;
  missing.push({ key, locs });
}

// ---- orphans (definite orphans FAIL; possibly-dynamic keys do not) ----
function isUsed(defKey) {
  const base = baseKey(defKey);
  if (literalUses.has(defKey) || literalUses.has(base)) return true;
  for (const prefix of dynamicPrefixes) {
    if (prefix && (defKey.startsWith(prefix) || base.startsWith(prefix))) return true;
  }
  return false;
}
let blob = '';
for (const f of files) blob += fs.readFileSync(f, 'utf8');
const orphans = [];
for (const k of enKeys) {
  if (!esKeys.has(k) || isUsed(k)) continue;
  const base = baseKey(k);
  const indirect = [`'${base}'`, `"${base}"`, '`' + base + '`', `'${k}'`, `"${k}"`].some((s) => blob.includes(s));
  if (!indirect) orphans.push(k);
}
orphans.sort();

// ---- --prune: delete definite orphans from both locale files ----
if (process.argv.includes('--prune')) {
  const deleteKey = (obj, dotted) => {
    const parts = dotted.split('.');
    const stack = [];
    let cur = obj;
    for (const p of parts.slice(0, -1)) {
      stack.push([cur, p]);
      cur = cur[p];
      if (!cur || typeof cur !== 'object') return;
    }
    delete cur[parts[parts.length - 1]];
    // remove empty parents left behind
    for (let i = stack.length - 1; i >= 0; i--) {
      const [parent, key] = stack[i];
      if (Object.keys(parent[key]).length === 0) delete parent[key];
      else break;
    }
  };
  for (const rel of ['packages/shared/src/locales/en/translation.json', 'packages/shared/src/locales/es/translation.json']) {
    const data = readJson(rel);
    for (const k of orphans) deleteKey(data, k);
    fs.writeFileSync(path.join(REPO, rel), JSON.stringify(data, null, 2) + '\n');
  }
  console.log(`pruned ${orphans.length} orphan keys from en and es translation.json`);
  process.exit(0);
}

// ---- report ----
let failed = false;
function parityFail(label, keys) {
  if (keys.length === 0) return;
  failed = true;
  console.error(`FAIL ${label} (${keys.length}):`);
  for (const k of keys) console.error(`  ${k}`);
}
parityFail('translation.json: en keys missing from es', enMissingFromEs);
parityFail('translation.json: es keys missing from en', esMissingFromEn);
parityFail('_locales: en keys missing from es', extEnMissingFromEs);
parityFail('_locales: es keys missing from en', extEsMissingFromEn);

if (missing.length > 0) {
  failed = true;
  console.error(`FAIL missing translation keys referenced in source (${missing.length}):`);
  for (const { key, locs } of missing) console.error(`  ${key}\n    ${locs.join('\n    ')}`);
}

if (orphans.length > 0) {
  failed = true;
  console.error(`FAIL orphan translation keys with no reference in source (${orphans.length}):`);
  for (const k of orphans) console.error(`  ${k}`);
  console.error('  (delete them, or run: node scripts/check-i18n.mjs --prune)');
}

console.log(
  `i18n check: ${enKeys.size} en keys, ${esKeys.size} es keys, ` +
    `${literalUses.size} literal uses, ${dynamicPrefixes.size} dynamic prefixes, ` +
    `${orphans.length} orphans`
);
if (failed) process.exit(1);
console.log('i18n check passed');
