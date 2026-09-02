#!/usr/bin/env node
/**
 * check-dom-parity — the extension is the mobile app on the DOM (spec 028).
 *
 * Five checks, every one a build failure:
 *
 *  1. theme    — DOM code (packages/ui, apps/extension) reads the live mode
 *                only: no static `semantic` / `colors` import from
 *                @salmon/shared, no MUI, no hex literal, no `mode ===` in a
 *                component.
 *  2. twins    — every mobile kit component has a DOM twin and every DOM
 *                component has a mobile twin, by name or through MAP;
 *                anything platform-only is listed with a reason.
 *  3. contract — both twins of a pair `extends` (or alias) the same `*Base`
 *                contract from packages/shared/src/types/ui — one contract,
 *                two renderings. Detected on the `extends` clause, not on an
 *                import that might go unused.
 *  4. dead     — every contract under packages/shared/src/types/ui has a
 *                reader on at least one platform.
 *  5. screens  — every mobile route (apps/mobile/app) has the DOM screen
 *                SCREENS names, and that file exists; platform-only routes
 *                are listed with a reason.
 *  6. clones   — lines jscpd finds duplicated between apps/mobile and the DOM
 *                (packages/ui + apps/extension), tests excluded, stay under
 *                CROSS_PLATFORM_CLONE_LINES_MAX. Two renderings of one design
 *                legitimately share shape, so the ceiling is not zero — it is
 *                a ratchet: lower it when a lot hoists logic into shared, and
 *                the number can never climb back.
 *
 * Usage: node scripts/check-dom-parity.mjs [--report] [--no-clones]
 *   --report prints every finding and exits 0; otherwise any finding exits 1.
 *   --no-clones skips the jscpd pass (~1 min) for a quick local run.
 *
 * The maps below are the one place a platform difference is allowed to live.
 * A new mobile component or route with no DOM twin fails here until it has
 * one, or until it is listed with the reason it never will.
 */
import { readdirSync, readFileSync, statSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * The cross-platform clone ceiling, in lines (jscpd, min 5 lines / 50 tokens,
 * tests and e2e suites excluded). 3559 measured on 2026-09-02 before lot 6, 2980 after 6a+6b;
 * every lot that hoists logic into packages/shared lowers it to the new
 * measurement. It may only go down.
 */
export const CROSS_PLATFORM_CLONE_LINES_MAX = 2980;

/** Twins whose folders are not named the same. mobile folder → DOM folder(s). */
export const MAP = {
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
  Icon: ['Icon'],
  LockOverlay: ['LockScreen'],
  Send: ['SendPage', 'InputAddress'],
  SettingsScreenLayout: ['SettingsPanelContent'],
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

/** Mobile-only components, with the reason the DOM has nothing to mirror. */
export const MOBILE_ONLY = {
  QRScanner: 'camera — the side panel has no scanner; paste is the DOM path',
  PowerupsFab: 'POWERUPS_SURFACE_ENABLED=false for the submission; spec 027 rebuilds it',
  PowerupBadge: 'same — powerups surface closed',
  SwapScreen: 'swap retired until spec 027; deleted from both when it lands',
  SubAccountSelector: 'NftSectionHeader chips — mobile-only per spec 025 §Wallets',
  BottomSheetTitleHeader: 'RN sheet chrome; the DOM sheet is a <dialog> with SheetTitle inside',
  TokenLogo: 'expo-image wrapper; the DOM uses <img> inside IconBubble/TokenList',
  InputAddress: 'the DOM twin is RecipientInput inside InputAddress (mapped from Send)',
  TokenSelector: 'the DOM picker is TokenPickerSheet inside SendPage',
};

/** DOM-only components, with the reason (spec 028 "DOM alternatives" or extension runtime). */
export const DOM_ONLY = {
  DAppApproval: 'extension-only surface (lot 5)',
  AuthFlow: 'onboarding screens are routes on mobile (app/(auth)); components on the DOM',
  WaterColumn:
    'the DOM ground composer; mobile mounts DepthBackground + ScalesBackground in the tab shell',
  SinkFloat: 'WAAPI sink/float wrapper — mobile uses Reanimated entering/exiting inline',
  FadeThrough: 'WAAPI fade-through — mobile uses Reanimated inline',
  CopyTick: 'DOM copy affordance; mobile uses haptics + toast',
  TextInput: 'DOM input primitive; mobile uses RN TextInput directly',
  NftDetailPage: 'mobile has it as a route (app/(app)/nft/[id]); the DOM keeps a component',
  TokenDetailPage: 'mobile has it as a route (app/(app)/token/[id]); the DOM keeps a component',
  WalletsScreen: "mobile's Wallets is the route app/(app)/wallets.tsx; the DOM keeps a component",
  SettingsPanelStack:
    "mobile's Settings root is the route app/(app)/settings/index.tsx; the DOM keeps a component",
};

/**
 * Mobile route (relative to apps/mobile/app, no extension) → DOM screen file
 * (relative to the repo root). Several routes may share one DOM screen when
 * the DOM keeps the steps in one component.
 */
export const SCREENS = {
  '(app)/(tabs)/index': 'apps/extension/src/pages/home/HomePage.tsx',
  '(app)/wallets': 'packages/ui/src/components/WalletsScreen/WalletsScreen.tsx',
  '(app)/activity': 'packages/ui/src/components/TransactionHistoryPage/TransactionHistoryPage.tsx',
  '(app)/send/index': 'packages/ui/src/components/SendPage/SendPage.tsx',
  '(app)/send/amount': 'packages/ui/src/components/SendPage/SendPage.tsx',
  '(app)/send/review': 'packages/ui/src/components/SendPage/SendPage.tsx',
  '(app)/send/success': 'packages/ui/src/components/SendPage/SendPage.tsx',
  '(app)/nft/[id]/index': 'packages/ui/src/components/NftDetailPage/NftDetailPage.tsx',
  '(app)/nft/[id]/burn': 'packages/ui/src/components/NftDetailPage/NftDetailPage.tsx',
  '(app)/nft/[id]/review': 'packages/ui/src/components/NftDetailPage/NftDetailPage.tsx',
  '(app)/nft/[id]/success': 'packages/ui/src/components/NftDetailPage/NftDetailPage.tsx',
  '(app)/nft/[id]/send': 'packages/ui/src/components/SendPage/SendPage.tsx',
  '(app)/token/[id]': 'packages/ui/src/components/TokenDetailPage/TokenDetailPage.tsx',
  '(app)/settings/index': 'packages/ui/src/components/SettingsPanelStack/SettingsPanelStack.tsx',
  '(app)/settings/[panel]': 'packages/ui/src/components/SettingsPanelStack/SettingsPanelStack.tsx',
  '(auth)/index': 'packages/ui/src/components/AuthFlow/SelectOptionsPage.tsx',
  '(auth)/create': 'packages/ui/src/components/AuthFlow/CreateWalletPage.tsx',
  '(auth)/seed-warning': 'packages/ui/src/components/AuthFlow/CreateWalletPage.tsx',
  '(auth)/recover': 'packages/ui/src/components/AuthFlow/RecoverWalletPage.tsx',
  '(auth)/password': 'packages/ui/src/components/AuthFlow/PasswordPage.tsx',
  '(auth)/success': 'packages/ui/src/components/AuthFlow/SuccessPage.tsx',
  '(auth)/analytics-consent': 'packages/ui/src/components/AuthFlow/AnalyticsConsentPage.tsx',
};

/** Mobile-only routes, with the reason. */
export const MOBILE_ONLY_SCREENS = {
  '(app)/(tabs)/swap': 'swap retired until spec 027',
  '(app)/powerups': 'powerups surface closed for the submission; spec 027',
  '(auth)/biometric-setup': 'biometrics are native; the extension has none',
  '+html': 'Expo scaffolding',
  '+not-found': 'Expo scaffolding',
};

const THEME_EXEMPT = [/packages\/ui\/src\/theme\//, /packages\/ui\/src\/icons\.ts$/];

/**
 * Run every check against a repo root. Returns the findings as
 * `{ check, message }` objects plus the twin pairs it matched.
 */
export function run(root, { clones = false } = {}) {
  const MOBILE_COMPONENTS = join(root, 'apps/mobile/src/components');
  const MOBILE_APP = join(root, 'apps/mobile/app');
  const UI_COMPONENTS = join(root, 'packages/ui/src/components');
  const SHARED_UI_TYPES = join(root, 'packages/shared/src/types/ui');
  const DOM_ROOTS = [join(root, 'packages/ui/src'), join(root, 'apps/extension/src')];

  const findings = [];
  const note = (check, message) => findings.push({ check, message });
  const rel = (p) => relative(root, p);

  const dirs = (p) =>
    existsSync(p) ? readdirSync(p).filter((n) => statSync(join(p, n)).isDirectory()) : [];

  const walk = (dir, out = []) => {
    if (!existsSync(dir)) return out;
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (n === 'node_modules' || n === 'dist' || n === '.wxt') continue;
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(n) && !/\.(test|spec|d)\.tsx?$/.test(n)) out.push(p);
    }
    return out;
  };

  const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  // 1. theme ------------------------------------------------------------------
  for (const domRoot of DOM_ROOTS) {
    for (const file of walk(domRoot)) {
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
      if (/from\s*'@mui\//.test(src)) note('theme', `${r}: imports @mui — the kit has no MUI`);
      if (/theme\.palette|\bsx=\{/.test(src))
        note('theme', `${r}: MUI theme.palette / sx — use tokens through useSemantic()`);
      const hex = src.match(/['"`]#[0-9a-fA-F]{3,8}\b/g);
      if (hex) note('theme', `${r}: hex literal ${[...new Set(hex)].join(', ')} — use a token`);
      if (
        /\bmode\s*===\s*'(light|dark)'/.test(src) &&
        !/color-scheme|StatusBar|colorScheme/.test(src)
      )
        note('theme', `${r}: \`mode ===\` in a component — ask a token, not the mode`);
    }
  }

  // 2. twins ------------------------------------------------------------------
  const mobile = new Set(dirs(MOBILE_COMPONENTS));
  const ui = new Set(dirs(UI_COMPONENTS));
  const pairs = [];
  const claimedUi = new Set();

  for (const m of mobile) {
    if (m in MOBILE_ONLY) continue;
    for (const t of MAP[m] ?? [m]) {
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
    if (!mobile.has(k)) note('twins', `MOBILE_ONLY lists ${k} but apps/mobile has no such folder`);
  for (const k of Object.keys(DOM_ONLY))
    if (!ui.has(k)) note('twins', `DOM_ONLY lists ${k} but packages/ui has no such folder`);

  // 3. contract ---------------------------------------------------------------
  // The names a folder builds its props ON: `extends XBase`, `= XBase`,
  // `= XBase<…>`, `XBase & {…}`. An import alone does not count.
  const basesBuiltOn = (dir) => {
    const names = new Set();
    for (const f of walk(dir)) {
      const src = stripComments(readFileSync(f, 'utf8'));
      for (const m of src.matchAll(/\bextends\s+([A-Za-z0-9_]+Base)\b/g)) names.add(m[1]);
      for (const m of src.matchAll(/=\s*([A-Za-z0-9_]+Base)\b\s*(?:<[^;]*>)?\s*(?:&|;|$)/gm))
        names.add(m[1]);
    }
    return names;
  };

  for (const [m, t] of pairs) {
    const a = basesBuiltOn(join(MOBILE_COMPONENTS, m));
    const b = basesBuiltOn(join(UI_COMPONENTS, t));
    const shared = [...a].filter((n) => b.has(n));
    if (shared.length === 0)
      note(
        'contract',
        `${m} ↔ ${t}: no shared *Base contract (mobile builds on {${[...a].join(', ') || '—'}}, DOM on {${[...b].join(', ') || '—'}})`
      );
  }

  // 4. dead -------------------------------------------------------------------
  const consumers = [
    ...walk(join(root, 'apps/mobile/src')),
    ...walk(join(root, 'apps/mobile/app')),
    ...walk(join(root, 'apps/mobile/hooks')),
    ...walk(join(root, 'packages/ui/src')),
    ...walk(join(root, 'apps/extension/src')),
  ]
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');
  for (const f of walk(SHARED_UI_TYPES)) {
    if (basename(f) === 'index.ts') continue;
    const src = readFileSync(f, 'utf8');
    const exported = [...src.matchAll(/export\s+(?:interface|type)\s+([A-Za-z0-9_]+)/g)].map(
      (x) => x[1]
    );
    const read = exported.filter((n) => new RegExp(`\\b${n}\\b`).test(consumers));
    if (exported.length > 0 && read.length === 0)
      note('dead', `${rel(f)}: no consumer on any platform for {${exported.join(', ')}}`);
  }

  // 5. screens ----------------------------------------------------------------
  const routes = walk(MOBILE_APP)
    .map((f) => relative(MOBILE_APP, f).replace(/\.tsx?$/, ''))
    .filter((r) => !/(^|\/)_layout$/.test(r));
  for (const r of routes) {
    if (r in MOBILE_ONLY_SCREENS) continue;
    const dom = SCREENS[r];
    if (!dom)
      note(
        'screens',
        `mobile route ${r} has no DOM screen — add it to SCREENS or MOBILE_ONLY_SCREENS`
      );
    else if (!existsSync(join(root, dom)))
      note('screens', `mobile route ${r} → ${dom} does not exist`);
  }
  for (const r of Object.keys(SCREENS))
    if (!routes.includes(r))
      note('screens', `SCREENS lists ${r} but apps/mobile/app has no such route`);
  for (const r of Object.keys(MOBILE_ONLY_SCREENS))
    if (!routes.includes(r))
      note('screens', `MOBILE_ONLY_SCREENS lists ${r} but apps/mobile/app has no such route`);

  // 6. clones -----------------------------------------------------------------
  if (clones) {
    const lines = crossPlatformCloneLines(root);
    if (lines > CROSS_PLATFORM_CLONE_LINES_MAX)
      note(
        'clones',
        `${lines} lines duplicated between mobile and the DOM — above the ${CROSS_PLATFORM_CLONE_LINES_MAX} ceiling; hoist the logic into packages/shared`
      );
    else if (lines < CROSS_PLATFORM_CLONE_LINES_MAX * 0.95)
      note(
        'clones',
        `${lines} lines duplicated — well under the ${CROSS_PLATFORM_CLONE_LINES_MAX} ceiling; lower CROSS_PLATFORM_CLONE_LINES_MAX to ${lines} so it cannot climb back`
      );
  }

  return { findings, pairs };
}

/** Lines jscpd reports as duplicated with one side on mobile and one on the DOM. */
export function crossPlatformCloneLines(root) {
  const out = mkdtempSync(join(tmpdir(), 'dom-parity-jscpd-'));
  try {
    execFileSync(
      'npx',
      [
        'jscpd',
        'packages/',
        'apps/',
        '--min-lines',
        '5',
        '--min-tokens',
        '50',
        '--format',
        'typescript,javascript,tsx,jsx',
        '--ignore',
        '**/node_modules/**,**/coverage/**,**/dist/**,**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/.expo/**,**/.playwright/**,**/.maestro/**',
        '--reporters',
        'json',
        '--output',
        out,
        '--silent',
      ],
      { cwd: root, stdio: 'ignore' }
    );
    const report = JSON.parse(readFileSync(join(out, 'jscpd-report.json'), 'utf8'));
    const side = (name) =>
      name.startsWith('mobile/') ? 'mobile' : /^(ui|extension)\//.test(name) ? 'dom' : 'other';
    return report.duplicates
      .filter((d) => {
        const a = side(d.firstFile.name);
        const b = side(d.secondFile.name);
        return (a === 'mobile' && b === 'dom') || (a === 'dom' && b === 'mobile');
      })
      .reduce((sum, d) => sum + d.lines, 0);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

const CHECKS = ['theme', 'twins', 'contract', 'dead', 'screens', 'clones'];

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
  const reportOnly = process.argv.includes('--report');
  const { findings, pairs } = run(root, { clones: !process.argv.includes('--no-clones') });

  for (const check of CHECKS) {
    const lines = findings.filter((f) => f.check === check);
    if (lines.length === 0) continue;
    console.log(`\n${check} — ${lines.length}`);
    for (const l of lines) console.log('  ' + l.message);
  }
  console.log(
    `\ndom-parity: ${pairs.length} twin pairs, ${findings.length} findings${reportOnly ? ' (report only)' : ''}`
  );
  if (findings.length > 0 && !reportOnly) process.exit(1);
}
