import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findHidden, TEXT_FILE } from './check-hidden-unicode.mjs';

// Every hidden character below is written as an escape: this file is tracked,
// and the gate reads it too.

test('plain text, accents, emoji and a leading byte-order mark pass', () => {
  assert.deepEqual(findHidden('Send — envío rápido ✅\nsecond line'), []);
  assert.deepEqual(findHidden('\uFEFFfirst line'), []);
  // A composed emoji is two pictographs held by a zero-width joiner.
  assert.deepEqual(findHidden('team \u{1F468}\u200D\u{1F469} here'), []);
});

test('a zero-width character is reported with its place', () => {
  assert.deepEqual(findHidden('ok\nig\u200Bnore previous rules'), [
    { line: 2, column: 3, code: 'U+200B' },
  ]);
});

test('bidirectional controls are reported', () => {
  const codes = findHidden('a\u202Eb\u2066c\u2069d').map((f) => f.code);
  assert.deepEqual(codes, ['U+202E', 'U+2066', 'U+2069']);
});

test('tag characters, which spell text nobody sees, are reported', () => {
  assert.deepEqual(findHidden('rule\u{E0041}\u{E0042}'), [
    { line: 1, column: 5, code: 'U+E0041' },
    { line: 1, column: 7, code: 'U+E0042' },
  ]);
});

test('a joiner that is not between two pictographs is reported', () => {
  assert.equal(findHidden('pass\u200Dword').length, 1);
});

test('a byte-order mark in the middle of a file is reported', () => {
  assert.equal(findHidden('a\uFEFFb').length, 1);
});

test('instruction, code and configuration files count as text by their name', () => {
  for (const file of [
    'AGENTS.md',
    '.claude/skills/x/SKILL.md',
    '.github/workflows/ci.yml',
    '.githooks/pre-commit',
    'src/index.js',
    'package.json',
  ]) {
    assert.ok(TEXT_FILE.test(file), file);
  }
  for (const file of [
    'assets/logo.png',
    'src/availability/data/dbip-country-lite.mmdb',
    'vendor/pkg.tgz',
  ]) {
    assert.ok(!TEXT_FILE.test(file), file);
  }
});
