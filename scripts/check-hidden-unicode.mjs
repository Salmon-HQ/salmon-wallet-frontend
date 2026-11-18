#!/usr/bin/env node
// Hidden-text gate: fails when a tracked text file carries a character that
// renders as nothing — bidirectional controls, zero-width characters, Unicode
// tag characters. GitHub's diff view does not show them, so a reviewer cannot
// see an instruction written with them, while a coding agent that loads the
// file reads it. That matters most in the files agents obey (AGENTS.md,
// CLAUDE.md, .claude/, .github/), and it is the same trick as "Trojan Source"
// in code, so every tracked text file is checked.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// U+200B–200F zero-width and direction marks, U+202A–202E and U+2066–2069
// bidirectional controls, U+2060–2064 invisible operators, U+FEFF byte-order
// mark used mid-file, U+E0000–E007F tag characters.
const HIDDEN = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\u{E0000}-\u{E007F}]/gu;
// A zero-width joiner between two pictographs is how a composed emoji is
// written, and a variation selector is not in the set at all.
const EMOJI_JOINER = /(?<=\p{Extended_Pictographic}\uFE0F?)\u200D(?=\p{Extended_Pictographic})/gu;

// Files that are text by their name: instructions, code, configuration.
export const TEXT_FILE =
  /(^|\/)(\.[a-z]+rc|\.gitignore|\.gitattributes|CODEOWNERS|Dockerfile|pre-commit|pre-push)$|\.(md|mdc|txt|js|mjs|cjs|jsx|ts|tsx|json|ya?ml|toml|sh|css|html|svg|env\.example)$/i;

export function findHidden(text) {
  const findings = [];
  const body = text.replace(/^\uFEFF/, '').replace(EMOJI_JOINER, '');
  body.split('\n').forEach((line, index) => {
    for (const match of line.matchAll(HIDDEN)) {
      const code = match[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
      findings.push({ line: index + 1, column: match.index + 1, code: `U+${code}` });
    }
  });
  return findings;
}

function main() {
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  let count = 0;
  for (const file of files) {
    let buffer;
    try {
      buffer = readFileSync(file);
    } catch {
      continue; // listed but not on disk (a deletion not yet committed)
    }
    if (buffer.includes(0)) {
      // A NUL byte marks a binary file, which has no text to hide in. In a
      // file that is text by its name it is a way to be skipped by this very
      // check (UTF-16 has one in every other byte), so there it is a finding.
      if (TEXT_FILE.test(file)) {
        count += 1;
        console.error(`${file}  NUL byte in a text file: it must be UTF-8 text`);
      }
      continue;
    }
    for (const finding of findHidden(buffer.toString('utf8'))) {
      count += 1;
      console.error(`${file}:${finding.line}:${finding.column}  hidden character ${finding.code}`);
    }
  }
  if (count > 0) {
    console.error(
      `\nhidden-unicode: ${count} finding(s). Remove the character, or write the escape (\\u200B) where the code needs one.`
    );
    process.exit(1);
  }
  console.log(`hidden-unicode: ${files.length} tracked files, none carries a hidden character`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
