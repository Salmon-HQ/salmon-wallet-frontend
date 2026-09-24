#!/usr/bin/env node
/**
 * e2e selector audit — every selector the end-to-end suites use must exist in
 * the current source (spec 035).
 *
 * A suite that selects an element the app stopped rendering does not fail
 * where the element went away: it fails minutes later, on a device, reading
 * like an app bug. This check fails at the change instead, naming the flow,
 * the line and the selector.
 *
 * Checked:
 *  - Maestro (apps/mobile/.maestro): every `id:` and every text anchor
 *    (tapOn / assertVisible / visible / notVisible / text) against the mobile
 *    and shared source and the English copy.
 *  - Playwright (apps/extension/.playwright): every `getByTestId('…')` against
 *    the extension, ui and shared source.
 *
 * A testID built from a template (`${testID}-word-input-${n}`) matches when
 * its static part has at least four characters, so a bare `${a}-${b}` does not
 * vouch for everything. Strings the app does not own — the Expo dev menu,
 * system prompts, data a flow types itself — are listed in EXTERNAL, by name.
 */
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Strings a flow may anchor on that no Salmon source defines. */
export const EXTERNAL = new Set([
  // Expo dev launcher and its reload banner (dev builds only).
  'Development Build',
  'Refreshing...',
  // iOS system prompt when the app reads the pasteboard.
  'Allow Paste',
  // Data the flows type themselves.
  'Wallet B',
  'order-12',
  'Salmon Treasury',
]);

const read = (p) => readFileSync(p, 'utf8');
const sourceOf = (root, bases) =>
  bases
    .flatMap((b) => globSync(`${b}/**/*.{ts,tsx,js}`, { cwd: root }))
    .filter((p) => !/\.test\.|__tests__/.test(p))
    .map((p) => read(path.join(root, p)))
    .join('\n');

const staticPart = (t) => t.replace(/\$\{[^}]*\}/g, '');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function templatesOf(source) {
  return [...source.matchAll(/`([^`]*\$\{[^`]*)`/g)]
    .map((m) => m[1])
    .filter((t) => staticPart(t).length >= 4 && !staticPart(t).includes(' '))
    .map(
      (t) =>
        new RegExp(
          '^' +
            t
              .split(/\$\{[^}]*\}/)
              .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
              .join('.+') +
            '$'
        )
    );
}

export function makeResolver(source) {
  const templates = templatesOf(source);
  // A prefix handed down as a prop (`tabTestIDPrefix="portfolio-tab"`) that a
  // child joins with its own key: `portfolio-tab-nfts`.
  const prefixes = [...source.matchAll(/\w*Prefix\s*=\s*["']([^"']{4,})["']/g)].map(
    (m) => `${m[1]}-`
  );
  // The same, when the prefix is itself a template: `${testID}-option` joined
  // with a key gives `balance-chain-selector-option-bitcoin`.
  const prefixTemplates = [...source.matchAll(/\w*Prefix\s*=\s*\{`([^`]*\$\{[^`]*)`\}/g)]
    .map((m) => m[1])
    .filter((t) => staticPart(t).length >= 4)
    .map(
      (t) =>
        new RegExp(
          '^' +
            t
              .split(/\$\{[^}]*\}/)
              .map(esc)
              .join('.+') +
            '-.+$'
        )
    );
  return (id) =>
    new RegExp(`["'\`]${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'\`]`).test(source) ||
    templates.some((re) => re.test(id)) ||
    prefixes.some((p) => id.startsWith(p) && id.length > p.length) ||
    prefixTemplates.some((re) => re.test(id));
}

function copyOf(root) {
  const out = [];
  const walk = (v) =>
    typeof v === 'string'
      ? out.push(v)
      : v && typeof v === 'object' && Object.values(v).forEach(walk);
  for (const p of globSync('packages/shared/src/**/locales/en*.json', { cwd: root })) {
    walk(JSON.parse(read(path.join(root, p))));
  }
  for (const p of globSync('packages/shared/src/locales/en/*.json', { cwd: root })) {
    walk(JSON.parse(read(path.join(root, p))));
  }
  return out;
}

const ID_LINE = /^-?\s*id:\s*['"]?([^'"#]+?)['"]?\s*$/;
const TEXT_LINE =
  /^-?\s*(?:tapOn|assertVisible|assertNotVisible|visible|notVisible|text)\s*:\s*['"]([^'"]+)['"]\s*$/;

/** Maestro findings for one flow's text. */
export function auditMaestroFlow(file, text, { idExists, textExists }) {
  const findings = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (line.startsWith('#')) return;
    const id = line.match(ID_LINE)?.[1]?.trim();
    if (id && !id.includes('${') && !idExists(id)) findings.push(`${file}:${i + 1}  id  ${id}`);
    const t = line.match(TEXT_LINE)?.[1];
    // Regex anchors (`.*`, `(?i)`) are patterns, not strings; checked by hand.
    if (t && !t.includes('${') && !/[.*?|()]/.test(t) && !EXTERNAL.has(t) && !textExists(t)) {
      findings.push(`${file}:${i + 1}  text  ${t}`);
    }
    if (/^-?\s*point:/.test(line)) findings.push(`${file}:${i + 1}  point-tap  ${line}`);
    // A coordinate swipe lands wherever the layout puts that pixel — on a
    // backdrop, a scrim, the wrong card. Swipe from an id instead. UI the app
    // does not own (the Expo dev menu) has no ids; its line says so.
    if (/^-?\s*start:/.test(line) && !raw.includes('# external')) {
      findings.push(`${file}:${i + 1}  point-swipe  ${line}`);
    }
  });
  return findings;
}

/** Playwright findings for one spec's text. */
export function auditPlaywrightFile(file, text, idExists) {
  const findings = [];
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/getByTestId\(\s*['"]([^'"]+)['"]/g)) {
      if (!idExists(m[1])) findings.push(`${file}:${i + 1}  testid  ${m[1]}`);
    }
  });
  return findings;
}

export function audit(root) {
  const mobile = sourceOf(root, [
    'apps/mobile/app',
    'apps/mobile/src',
    'apps/mobile/hooks',
    'packages/shared/src',
  ]);
  const dom = sourceOf(root, ['apps/extension/src', 'packages/ui/src', 'packages/shared/src']);
  const copy = copyOf(root);
  const mobileId = makeResolver(mobile);
  const domId = makeResolver(dom);
  const textExists = (t) => copy.some((c) => c.includes(t)) || mobile.includes(t);

  const findings = [];
  for (const f of globSync('apps/mobile/.maestro/**/*.yaml', { cwd: root }).sort()) {
    findings.push(
      ...auditMaestroFlow(f, read(path.join(root, f)), { idExists: mobileId, textExists })
    );
  }
  const specs = globSync('apps/extension/.playwright/{tests/*.ts,helpers.ts,fixtures.ts}', {
    cwd: root,
  });
  for (const f of specs.sort())
    findings.push(...auditPlaywrightFile(f, read(path.join(root, f)), domId));
  return findings;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const findings = audit(root);
  for (const f of findings) console.log(f);
  console.log(`\ne2e-selectors: ${findings.length} finding${findings.length === 1 ? '' : 's'}`);
  process.exit(findings.length ? 1 : 0);
}
