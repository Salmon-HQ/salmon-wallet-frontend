import { test } from 'node:test';
import assert from 'node:assert/strict';

import { auditMaestroFlow, auditPlaywrightFile, makeResolver } from './check-e2e-selectors.mjs';

const source = `
  <View testID="receive-qr" />
  <TextInput testID={\`\${testID}-word-input-\${index + 1}\`} />
  const x = \`\${a}-\${b}\`;
  <UnderlineTabs tabTestIDPrefix="portfolio-tab" />
  <UnderlineTabs tabTestIDPrefix={\`\${testID}-option\`} />
`;
const idExists = makeResolver(source);

test('a literal testID resolves', () => {
  assert.equal(idExists('receive-qr'), true);
});

test('a template testID resolves by its static part', () => {
  assert.equal(idExists('recover-word-input-1'), true);
});

test('a template with no real static part vouches for nothing', () => {
  assert.equal(idExists('receive-address'), false);
});

test('a Maestro flow names the stale id, the line and the file', () => {
  const flow = "- assertVisible:\n    id: 'receive-address'\n";
  assert.deepEqual(auditMaestroFlow('f.yaml', flow, { idExists, textExists: () => true }), [
    'f.yaml:2  id  receive-address',
  ]);
});

test('a coordinate tap is a finding', () => {
  const flow = "- tapOn:\n    point: '50%,23%'\n";
  assert.equal(auditMaestroFlow('f.yaml', flow, { idExists, textExists: () => true }).length, 1);
});

test('external strings and regex anchors are not findings', () => {
  const flow = "- tapOn: 'Fast refresh'\n- assertVisible: '(?i)Welcome back|Unlock'\n";
  assert.deepEqual(auditMaestroFlow('f.yaml', flow, { idExists, textExists: () => false }), []);
});

test('a Playwright getByTestId on a removed element is a finding', () => {
  const spec = "await popup.getByTestId('tab-home').click();\n";
  assert.deepEqual(auditPlaywrightFile('s.spec.ts', spec, idExists), [
    's.spec.ts:1  testid  tab-home',
  ]);
});

test('a prefix handed down as a prop resolves the ids built on it', () => {
  assert.equal(idExists('portfolio-tab-nfts'), true);
});

test('a templated prefix resolves the ids a child builds on it', () => {
  assert.equal(idExists('balance-chain-selector-option-bitcoin'), true);
  assert.equal(idExists('balance-chain-selector-bitcoin'), false);
});

test('a coordinate swipe is a finding unless it is marked as external UI', () => {
  const opts = { idExists, textExists: () => true };
  const flow = "- swipe:\n    start: '50%, 20%'\n    end: '50%, 99%'\n";
  assert.deepEqual(auditMaestroFlow('f.yaml', flow, opts), [
    "f.yaml:2  point-swipe  start: '50%, 20%'",
  ]);
  const external = "- swipe:\n    start: '50%, 85%' # external: Expo dev menu\n";
  assert.deepEqual(auditMaestroFlow('f.yaml', external, opts), []);
});
