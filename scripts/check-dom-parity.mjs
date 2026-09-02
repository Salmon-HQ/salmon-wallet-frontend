#!/usr/bin/env node
/**
 * check-dom-parity — the extension is the mobile app on the DOM (spec 028).
 *
 * Four checks, every one a build failure:
 *
 *  1. theme   — DOM code (packages/ui, apps/extension) reads the live mode
 *               only: no static `semantic` / `colors` import from
 *               @salmon/shared, no MUI, no hex literal, no `mode ===` in a
 *               component.
 *  2. twins   — every mobile kit component has a DOM twin and every DOM
 *               component has a mobile twin, by name or through the MAP
 *               below; anything platform-only must be listed with a reason.
 *  3. contract — both twins of a pair read the same `*Base` contract from
 *               packages/shared/src/types/ui (one contract, two renderings).
 *  4. dead    — every contract under packages/shared/src/types/ui has a
 *               reader on at least one platform.
 *
 * Usage: node scripts/check-dom-parity.mjs [--report | --ratchet | --update-baseline]
 *   (none)            strict: exit 1 on any finding — the end state, CI once lot 4 closes.
 *   --report          print every finding, always exit 0 (reading progress).
 *   --ratchet         the CI mode while lot 4 is open: compare each check's count
 *                     against scripts/dom-parity.baseline.json and exit 1 only when
 *                     a count went UP. Counts may only fall (Notion's "ratchet",
 *                     eslint-seatbelt's model, without the dependency).
 *   --update-baseline rewrite the baseline with the current counts — run after a
 *                     lot lands and lowers a number; CI refuses a raise.
 */
import { readdirSync, readFileSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, relative, basename } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const REPORT_ONLY = process.argv.includes('--report');
const RATCHET = process.argv.includes('--ratchet');
const UPDATE_BASELINE = process.argv.includes('--update-baseline');
const BASELINE = join(ROOT, 'scripts/dom-parity.baseline.json');

const MOBILE_COMPONENTS = join(ROOT, 'apps/mobile/src/components');
const UI_COMPONENTS = join(ROOT, 'packages/ui/src/components');
const SHARED_UI_TYPES = join(ROOT, 'packages/shared/src/types/ui');
const DOM_ROOTS = [join(ROOT, 'packages/ui/src'), join(ROOT, 'apps/extension/src')];

/**
 * Twins whose folders are not named the same. mobile folder → DOM folder(s).
 * A mobile folder that fans out into several DOM folders lists them all;
 * every listed DOM folder must exist.
 */
const MAP = {
  AccountPanels: [
    'AccountAddPanel',
    'AccountAvatarPanel',
    'AccountEditPanel',
    'AccountNamePanel',
    'AccountsPanel',
  ],
  Activity: ['TransactionHistoryPage'],
  AddressPanels: ['AddressAddPanel', 'AddressBookPanel', 'AddressEditPanel'],
  ConfirmSheet: ['ConfirmDialog'],
  LockOverlay: ['LockScreen'],
  Send: ['SendPage', 'InputAddress'],
  SettingsScreenLayout: ['SettingsPanelStack', 'SettingsPanelContent'],
  SettingsSelectors: [
    'SettingsSelectorList',
    'AppearanceSelector',
    'CurrencySelector',
    'ExplorerSelector',
    'LanguageSelector',
  ],
  Skeleton: ['SkeletonRow'],
  TokenDetail: ['TokenAbout', 'TokenMarketData'],
  PressSpecular: ['Button'],
};

/** Mobile-only, with the reason the DOM has nothing to mirror. */
const MOBILE_ONLY = {
  QRScanner: 'camera — the side panel has no scanner; paste is the DOM path',
  PowerupsFab: 'POWERUPS_SURFACE_ENABLED=false for the submission; spec 027 rebuilds it',
  PowerupBadge: 'same — powerups surface closed',
  SwapScreen: 'swap retired until spec 027; deleted from both when it lands',
  TokenSelector:
    'swap-only picker; the DOM twin left with SwapScreen (lot 4F), mobile follows when swap does',
  SubAccountSelector: 'NftSectionHeader chips — mobile-only per spec 025 §Wallets',
  BottomSheetTitleHeader: 'RN sheet chrome; the DOM sheet is a <dialog> with SheetTitle inside',
  TokenLogo: 'expo-image wrapper; the DOM uses <img> inside IconBubble/TokenList',
  InputAddress:
    'hook re-exports only; the field is Send/RecipientInput, twinned by the DOM InputAddress folder',
};

/** DOM-only, with the reason (spec 028 "DOM alternatives" or extension runtime). */
const DOM_ONLY = {
  DAppApproval: 'extension-only surface (lot 5)',
  AuthFlow: 'onboarding screens are routes on mobile (app/(auth)); components on the DOM',
  WaterColumn:
    'the DOM ground composer; mobile mounts DepthBackground + ScalesBackground in the tab shell',
  SinkFloat: 'WAAPI sink/float wrapper — mobile uses Reanimated entering/exiting inline',
  FadeThrough: 'WAAPI fade-through — mobile uses Reanimated inline',
  CopyTick: 'DOM copy affordance; mobile uses haptics + toast',
  TextInput: 'DOM input primitive; mobile uses RN TextInput directly',
  NftDetailPage: 'mobile has it as a route (app/(app)/nft/[id]); the DOM keeps a component',
  TokenDetailPage:
    "mobile's token detail is the route app/(app)/token/[id].tsx; the DOM keeps a component whose cards (TokenAbout, TokenMarketData) are the twins",
  WalletsScreen: "mobile's Wallets is the route app/(app)/wallets.tsx; the DOM keeps a component",
};

const fail = [];
const note = (check, msg) => fail.push(`[${check}] ${msg}`);

const dirs = (p) =>
  existsSync(p) ? readdirSync(p).filter((n) => statSync(join(p, n)).isDirectory()) : [];

const walk = (dir, out = []) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (n === 'node_modules' || n === 'dist' || n === '.wxt') continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(n) && !/\.(test|spec|d)\.tsx?$/.test(n)) out.push(p);
  }
  return out;
};

const rel = (p) => relative(ROOT, p);
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// ---------------------------------------------------------------------------
// 1. theme discipline on the DOM
// ---------------------------------------------------------------------------
const THEME_EXEMPT = [/packages\/ui\/src\/theme\//, /packages\/ui\/src\/icons\.ts$/];
for (const root of DOM_ROOTS) {
  for (const file of walk(root)) {
    const r = rel(file);
    if (THEME_EXEMPT.some((re) => re.test(r))) continue;
    const src = stripComments(readFileSync(file, 'utf8'));

    const staticImport = src.match(/import\s*\{([^}]*)\}\s*from\s*'@salmon\/shared'/g) ?? [];
    for (const imp of staticImport) {
      for (const name of ['semantic', 'colors', 'salmonTheme']) {
        if (new RegExp(`[{,\\s]${name}[,\\s}]`).test(imp))
          note('theme', `${r}: static \`${name}\` import — read useSemantic()`);
      }
    }
    if (/from\s*'@mui\//.test(src))
      note('theme', `${r}: imports @mui — the adapter is retired after lot 4`);
    if (/theme\.palette|\bsx=\{/.test(src))
      note('theme', `${r}: MUI theme.palette / sx — use tokens through useSemantic()`);
    const hex = src.match(/['"`]#[0-9a-fA-F]{3,8}\b/g);
    if (hex) note('theme', `${r}: hex literal ${[...new Set(hex)].join(', ')} — use a token`);
    if (
      /\bmode\s*===\s*'(light|dark)'/.test(src) &&
      !/color-scheme|StatusBar|colorScheme/.test(src)
    ) {
      note('theme', `${r}: \`mode ===\` in a component — ask a token, not the mode`);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. twins
// ---------------------------------------------------------------------------
const mobile = new Set(dirs(MOBILE_COMPONENTS));
const ui = new Set(dirs(UI_COMPONENTS));
const pairs = [];
const claimedUi = new Set();

for (const m of mobile) {
  if (m in MOBILE_ONLY) continue;
  const targets = MAP[m] ?? [m];
  for (const t of targets) {
    if (!ui.has(t)) note('twins', `mobile ${m} has no DOM twin (${t} missing in packages/ui)`);
    else {
      pairs.push([m, t]);
      claimedUi.add(t);
    }
  }
}
for (const u of ui) {
  if (claimedUi.has(u) || u in DOM_ONLY) continue;
  note('twins', `DOM ${u} has no mobile twin — add it to MAP, or to DOM_ONLY with a reason`);
}
for (const k of Object.keys(MOBILE_ONLY))
  if (!mobile.has(k))
    note('twins', `MOBILE_ONLY lists ${k} but apps/mobile has no such folder — drop the entry`);
for (const k of Object.keys(DOM_ONLY))
  if (!ui.has(k))
    note('twins', `DOM_ONLY lists ${k} but packages/ui has no such folder — drop the entry`);

// ---------------------------------------------------------------------------
// 3. one contract per pair
// ---------------------------------------------------------------------------
const baseNames = (dir) => {
  const names = new Set();
  for (const f of walk(dir)) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/import\s+type\s*\{([^}]*)\}\s*from\s*'@salmon\/shared[^']*'/g)) {
      for (const n of m[1].split(',')) {
        const id = n.trim().split(/\s+as\s+/)[0];
        if (/Base$/.test(id)) names.add(id);
      }
    }
    for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'@salmon\/shared[^']*'/g)) {
      for (const n of m[1].split(',')) {
        const id = n
          .trim()
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)[0];
        if (/Base$/.test(id)) names.add(id);
      }
    }
  }
  return names;
};

for (const [m, t] of pairs) {
  const a = baseNames(join(MOBILE_COMPONENTS, m));
  const b = baseNames(join(UI_COMPONENTS, t));
  const shared = [...a].filter((n) => b.has(n));
  if (shared.length === 0) {
    note(
      'contract',
      `${m} ↔ ${t}: no shared *Base contract (mobile reads {${[...a].join(', ') || '—'}}, DOM reads {${[...b].join(', ') || '—'}})`
    );
  }
}

// ---------------------------------------------------------------------------
// 4. dead contracts
// ---------------------------------------------------------------------------
const consumers = [
  ...walk(join(ROOT, 'apps/mobile')),
  ...walk(join(ROOT, 'packages/ui/src')),
  ...walk(join(ROOT, 'apps/extension/src')),
]
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');
for (const f of walk(SHARED_UI_TYPES)) {
  if (basename(f) === 'index.ts') continue;
  const src = readFileSync(f, 'utf8');
  const exported = [...src.matchAll(/export\s+(?:interface|type)\s+([A-Za-z0-9_]+)/g)].map(
    (m) => m[1]
  );
  const read = exported.filter((n) => new RegExp(`\\b${n}\\b`).test(consumers));
  if (exported.length > 0 && read.length === 0)
    note('dead', `${rel(f)}: no consumer on any platform for {${exported.join(', ')}}`);
}

// ---------------------------------------------------------------------------
const byCheck = fail.reduce((acc, line) => {
  const k = line.slice(1, line.indexOf(']'));
  (acc[k] ??= []).push(line);
  return acc;
}, {});
for (const [k, lines] of Object.entries(byCheck)) {
  console.log(`\n${k} — ${lines.length}`);
  for (const l of lines) console.log('  ' + l.slice(l.indexOf(']') + 2));
}
const counts = Object.fromEntries(
  ['theme', 'twins', 'contract', 'dead'].map((k) => [k, byCheck[k]?.length ?? 0])
);
console.log(
  `\ndom-parity: ${pairs.length} twin pairs, ${fail.length} findings${REPORT_ONLY ? ' (report only)' : ''}`
);

if (UPDATE_BASELINE) {
  writeFileSync(BASELINE, JSON.stringify(counts, null, 2) + '\n');
  console.log(`baseline written: ${JSON.stringify(counts)}`);
  process.exit(0);
}

if (RATCHET) {
  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
  const raised = Object.entries(counts).filter(([k, n]) => n > (baseline[k] ?? 0));
  const lowered = Object.entries(counts).filter(([k, n]) => n < (baseline[k] ?? 0));
  for (const [k, n] of raised) console.log(`ratchet: ${k} went UP ${baseline[k]} → ${n}`);
  for (const [k, n] of lowered)
    console.log(
      `ratchet: ${k} fell ${baseline[k]} → ${n} — run --update-baseline so it cannot climb back`
    );
  process.exit(raised.length > 0 || lowered.length > 0 ? 1 : 0);
}

if (fail.length > 0 && !REPORT_ONLY) process.exit(1);
