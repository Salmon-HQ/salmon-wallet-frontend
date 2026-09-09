#!/usr/bin/env node
// Native fingerprint gate: the guard for the OTA rule in AGENTS.md ("OTA
// updates cannot carry native modules"). `native-fingerprint.json` records the
// native surface (config plugins, native deps, patches — `@expo/fingerprint`)
// of the last binary that was built, together with its `expo.version`.
//
// The rule: if the native fingerprint has moved since that binary, the version
// must have moved too — a JS bundle for a new native surface must never be
// published as an update to the old one. Fails otherwise.
//
// `--write` refreshes the baseline; run it as part of building a binary.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFingerprintAsync } from '@expo/fingerprint';

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(MOBILE, 'native-fingerprint.json');

const version = JSON.parse(fs.readFileSync(path.join(MOBILE, 'app.json'), 'utf8')).expo.version;
const { hash } = await createFingerprintAsync(MOBILE);

if (process.argv.includes('--write')) {
  fs.writeFileSync(BASELINE, `${JSON.stringify({ version, hash }, null, 2)}\n`);
  console.log(`native-fingerprint: baseline written for ${version} (${hash})`);
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));

if (hash === baseline.hash) {
  console.log(`native-fingerprint: unchanged since ${baseline.version} (${hash})`);
  process.exit(0);
}
if (version !== baseline.version) {
  console.log(
    `native-fingerprint: changed since ${baseline.version}, and expo.version is ${version} — a binary release. Refresh the baseline when it is built: pnpm --filter @salmon/mobile fingerprint:write`
  );
  process.exit(0);
}
console.error(
  `native-fingerprint: the native surface changed (${baseline.hash} → ${hash}) but app.json expo.version is still ${version}, the version of the last built binary.\n` +
    'An update carrying this change would crash every installed binary of that version at launch. Bump expo.version: this change ships as a binary, not as an OTA.'
);
process.exit(1);
