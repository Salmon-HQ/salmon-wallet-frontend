/**
 * check-dom-parity — one fixture repo per rule, so a change to the script
 * cannot silently stop catching what it is there to catch.
 *
 * Run: node --test scripts/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

import {
  run,
  MAP,
  MOBILE_ONLY,
  DOM_ONLY,
  SCREENS,
  MOBILE_ONLY_SCREENS,
} from './check-dom-parity.mjs';

/** A minimal repo where every check passes: one pair, one contract, one route. */
function fixture(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'dom-parity-'));
  const files = {
    'packages/shared/src/types/ui/card.ts': 'export interface CardPropsBase { tone?: string }\n',
    'apps/mobile/src/components/Card/types.ts':
      "import type { CardPropsBase } from '@salmon/shared';\nexport interface CardProps extends CardPropsBase { style?: unknown }\n",
    'apps/mobile/src/components/Card/Card.tsx':
      "import type { CardProps } from './types';\nexport function Card(_: CardProps) { return null; }\n",
    'packages/ui/src/components/Card/types.ts':
      "import type { CardPropsBase } from '@salmon/shared';\nexport interface CardProps extends CardPropsBase { className?: string }\n",
    'packages/ui/src/components/Card/Card.tsx':
      "import type { CardProps } from './types';\nimport { useSemantic } from '../../theme/ThemeProvider';\nexport function Card(_: CardProps) { const t = useSemantic(); return t.surface.raised; }\n",
    'apps/mobile/app/(app)/(tabs)/index.tsx': 'export default function Home() { return null; }\n',
    'apps/extension/src/pages/home/HomePage.tsx': 'export function HomePage() { return null; }\n',
    ...overrides,
  };
  for (const [p, src] of Object.entries(files)) {
    if (src === null) continue;
    mkdirSync(join(root, dirname(p)), { recursive: true });
    writeFileSync(join(root, p), src);
  }
  // The real maps list real components; a fixture only has Card and Home.
  // Every platform-only entry names a folder that does not exist here, so
  // the "listed but missing" lines are expected noise and filtered below.
  return root;
}

const listedButMissing = (f) => /lists .* but .* has no such (folder|route)/.test(f.message);
const findingsOf = (root, check) =>
  run(root)
    .findings.filter((f) => f.check === check)
    .filter((f) => !listedButMissing(f));

test('a clean pair on one contract passes every check', () => {
  const root = fixture();
  try {
    const { findings, pairs } = run(root);
    assert.equal(pairs.length, 1);
    assert.deepEqual(
      findings.filter((f) => !listedButMissing(f)),
      []
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('theme: static tokens, MUI, hex and mode branches are caught on the DOM only', () => {
  const root = fixture({
    'packages/ui/src/components/Card/Card.tsx':
      "import { semantic, colors } from '@salmon/shared';\nimport { styled } from '@mui/material';\nexport function Card() { const mode = 'light'; return mode === 'light' ? '#FFFFFF' : semantic.x; }\n",
    'apps/mobile/src/components/Card/Card.tsx':
      "import { semantic } from '@salmon/shared';\nexport function Card() { return '#000'; }\n",
  });
  try {
    const theme = findingsOf(root, 'theme').map((f) => f.message);
    assert.equal(theme.length, 5, theme.join('\n'));
    assert.ok(theme.some((m) => m.includes('static `semantic`')));
    assert.ok(theme.some((m) => m.includes('static `colors`')));
    assert.ok(theme.some((m) => m.includes('@mui')));
    assert.ok(theme.some((m) => m.includes('hex literal')));
    assert.ok(theme.some((m) => m.includes('mode ===')));
    assert.ok(
      theme.every((m) => m.startsWith('packages/ui/')),
      'mobile is not a DOM root'
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('theme: a comment is not code', () => {
  const root = fixture({
    'packages/ui/src/components/Card/Card.tsx':
      "// was '#FFFFFF' before the tokens\n/* import { semantic } from '@salmon/shared' */\nexport function Card() { return null; }\n",
  });
  try {
    assert.deepEqual(findingsOf(root, 'theme'), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('twins: a mobile component without a DOM folder, and the reverse', () => {
  const root = fixture({
    'apps/mobile/src/components/Ribbon/Ribbon.tsx': 'export function Ribbon() { return null; }\n',
    'packages/ui/src/components/Toast/Toast.tsx': 'export function Toast() { return null; }\n',
  });
  try {
    const twins = findingsOf(root, 'twins').map((f) => f.message);
    assert.ok(twins.some((m) => m.startsWith('mobile Ribbon has no DOM twin')));
    assert.ok(twins.some((m) => m.startsWith('DOM Toast has no mobile twin')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('contract: importing the base is not building on it', () => {
  const root = fixture({
    'apps/mobile/src/components/Card/types.ts':
      "import type { CardPropsBase } from '@salmon/shared';\nexport interface CardProps { tone?: string }\n",
  });
  try {
    const contract = findingsOf(root, 'contract').map((f) => f.message);
    assert.equal(contract.length, 1, contract.join('\n'));
    assert.ok(contract[0].startsWith('Card ↔ Card: no shared *Base contract'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('contract: a type alias on the base counts as building on it', () => {
  const root = fixture({
    'packages/ui/src/components/Card/types.ts':
      "import type { CardPropsBase } from '@salmon/shared';\nexport type CardProps = CardPropsBase<string> & { className?: string };\n",
  });
  try {
    assert.deepEqual(findingsOf(root, 'contract'), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('dead: a contract nobody reads', () => {
  const root = fixture({
    'packages/shared/src/types/ui/ribbon.ts': 'export interface RibbonPropsBase { x: 1 }\n',
  });
  try {
    const dead = findingsOf(root, 'dead').map((f) => f.message);
    assert.equal(dead.length, 1);
    assert.ok(dead[0].includes('ribbon.ts'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('screens: a mobile route the DOM does not draw, and a mapped file that is gone', () => {
  const root = fixture({
    'apps/mobile/app/(app)/ribbon.tsx': 'export default function Ribbon() { return null; }\n',
    'apps/extension/src/pages/home/HomePage.tsx': null,
  });
  try {
    const screens = findingsOf(root, 'screens').map((f) => f.message);
    assert.ok(screens.some((m) => m.startsWith('mobile route (app)/ribbon has no DOM screen')));
    assert.ok(
      screens.some((m) =>
        m.includes('(app)/(tabs)/index → apps/extension/src/pages/home/HomePage.tsx does not exist')
      )
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the maps do not contradict each other', () => {
  for (const [m, targets] of Object.entries(MAP)) {
    assert.ok(!(m in MOBILE_ONLY), `${m} is both mapped and mobile-only`);
    for (const t of targets) assert.ok(!(t in DOM_ONLY), `${t} is both a twin and DOM-only`);
  }
  for (const r of Object.keys(SCREENS))
    assert.ok(!(r in MOBILE_ONLY_SCREENS), `${r} is both mapped and mobile-only`);
});
