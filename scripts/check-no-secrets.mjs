#!/usr/bin/env node
// Wallet-material gate: fails when a tracked text file carries what looks
// like a seed phrase or a private key. GitHub's secret scanning knows API
// tokens, not BIP39 — this is the check for the rule in SECURITY.md and
// CONTRIBUTING.md ("never commit seed phrases, private keys, or passwords").
//
// What it flags:
//   - twelve or more consecutive BIP39 (English) words, on one line or across
//     lines, separated by spaces, commas, quotes, brackets, "1." numbering,
//     "-" / "*" / "•" bullets, escaped "\n" / "\t", or a `// …` comment
//     after each word
//   - a base58 run of 86–90 characters (a 64-byte Solana keypair)
//   - a bracketed array of 64 integers from 0 to 255 (a keypair as JSON), on
//     one line or many
//   - a Bitcoin WIF private key (base58check, 51–52 characters, checksum valid)
//   - a BIP32 extended private key (xprv, tprv and their SLIP-132 variants)
//   - a PEM (or PGP armoured) private key header
//   - 32- or 64-byte hex, and a 32-byte base58 string, on a line that names a
//     private or secret key: those shapes are also hashes, signatures and
//     addresses, so only the name beside them tells a key apart
//
// A known public fixture passes: a run of words that is exactly one of the
// public BIP39 test vectors is recognised, and any other line is allowed by a
// `no-secrets-ignore: <why>` marker on it.
//
// Scans the files git tracks plus staged changes, so a fixture pasted into a
// test is caught before it is pushed. Lockfiles and the locale files are
// skipped: the former never hold prose, the latter hold sentences that a
// wordlist would sometimes read as a phrase.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The wordlist comes from @scure/bip39, a dependency of packages/shared and not
// of the root: resolve it from there, so the gate works whatever the install
// layout (hoisted or not).
const fromShared = createRequire(path.join(REPO, 'packages/shared/package.json'));
export const { wordlist } = await import(
  pathToFileURL(fromShared.resolve('@scure/bip39/wordlists/english.js')).href
);
const BIP39 = new Set(wordlist);

const MIN_PHRASE_WORDS = 12;
const SKIP =
  /(^|\/)(pnpm-lock\.yaml|.*\.(png|jpg|jpeg|gif|webp|ico|svg|ttf|otf|woff2?|pdf|zip|aab|apk|jks|p12|lottie))$|(^|\/)locales\//;

// A standalone token: the lookarounds reject a base58-looking run inside a longer
// base64 blob (a serialised transaction fixture is not a key).
const BASE58_KEYPAIR = /(?<![A-Za-z0-9+\/=])[1-9A-HJ-NP-Za-km-z]{86,90}(?![A-Za-z0-9+\/=])/;

// Public test vectors are not secrets: the all-"abandon" BIP39 spec vectors
// and the phrase every Solana and Ethereum test tool ships. Only the whole
// sequence counts. Anything else needs the marker.
const KNOWN_VECTORS = [
  [...Array(11).fill('abandon'), 'about'],
  [...Array(17).fill('abandon'), 'agent'],
  [...Array(23).fill('abandon'), 'art'],
  [...Array(11).fill('test'), 'junk'],
];
const IGNORE_MARKER = 'no-secrets-ignore';
const BYTE = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const BYTE_ARRAY_KEYPAIR = new RegExp(`\\[\\s*(?:${BYTE}\\s*,\\s*){63}${BYTE}\\s*,?\\s*\\]`, 'g');
const EXTENDED_PRIVATE_KEY =
  /(?<![A-Za-z0-9])[xtyzuvYZUV]prv[1-9A-HJ-NP-Za-km-z]{107,108}(?![A-Za-z0-9])/;
const PEM_PRIVATE_KEY = /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----/;

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const WIF_CANDIDATE = /(?<![A-Za-z0-9+\/=])[59KLc][1-9A-HJ-NP-Za-km-z]{50,51}(?![A-Za-z0-9+\/=])/g;
const BASE58_32_CANDIDATE = /(?<![A-Za-z0-9+\/=])[1-9A-HJ-NP-Za-km-z]{43,44}(?![A-Za-z0-9+\/=])/g;
const HEX_KEY = /(?<![0-9a-fA-F])(?:[0-9a-fA-F]{64}|[0-9a-fA-F]{128})(?![0-9a-fA-F])/;
const KEY_NAME = /(?:priv(?:ate)?|secret|signing)[\s_-]*key|\bsecret\b|\bwif\b/i;

// A word of a phrase stands alone: `word1` is a placeholder and `seed_phrase`
// an identifier, not BIP39 words.
const WORD = /(?<![A-Za-z0-9_])[A-Za-z]+(?![A-Za-z0-9_])/g;
// What may sit between two words of a written-down phrase: whitespace and
// line breaks, list punctuation and bullets, and "1." / "2)" numbering.
const PHRASE_GAP = /^(?:[\s,;'"`[\](){}|*•-]|\d{1,2}[.):]?)*$/;
// Escaped line breaks and tabs inside a string read as the space they stand for.
const ESCAPED_SPACE = /\\[nrt]/g;
const TRAILING_COMMENT = /\/\/.*$/;

function decodeBase58(text) {
  let value = 0n;
  for (const char of text) value = value * 58n + BigInt(BASE58_ALPHABET.indexOf(char));
  const bytes = [];
  while (value > 0n) {
    bytes.unshift(Number(value % 256n));
    value /= 256n;
  }
  for (const char of text) {
    if (char !== '1') break;
    bytes.unshift(0);
  }
  return Buffer.from(bytes);
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest();

/** A Bitcoin WIF: version 0x80 or 0xef, 32 key bytes, an optional 0x01, a valid checksum. */
function isWif(token) {
  const bytes = decodeBase58(token);
  if (bytes.length !== 37 && !(bytes.length === 38 && bytes[33] === 0x01)) return false;
  if (bytes[0] !== 0x80 && bytes[0] !== 0xef) return false;
  return sha256(sha256(bytes.subarray(0, -4)))
    .subarray(0, 4)
    .equals(bytes.subarray(-4));
}

/** Where a known vector starts in `words` at `index`, its length; else 0. */
function vectorAt(words, index) {
  const vector = KNOWN_VECTORS.find((candidate) =>
    candidate.every((word, offset) => words[index + offset]?.word === word)
  );
  return vector ? vector.length : 0;
}

/** A run with every whole public vector cut out: the pieces left, each still a run if long enough. */
function withoutVectors(run) {
  const pieces = [[]];
  for (let index = 0; index < run.length;) {
    const skip = vectorAt(run, index);
    if (skip > 0) {
      pieces.push([]);
      index += skip;
    } else {
      pieces.at(-1).push(run[index]);
      index += 1;
    }
  }
  return pieces.filter((piece) => piece.length >= MIN_PHRASE_WORDS);
}

/**
 * Runs of `MIN_PHRASE_WORDS`+ BIP39 words, with the line each starts on.
 * `stripComments` reads each line without a trailing `// …` comment, so words
 * annotated one per line join up; the plain pass still reads phrases inside
 * comments.
 */
function phraseRuns(lines, { stripComments = false } = {}) {
  const runs = [];
  let run = [];
  let gap = '';
  const close = () => {
    if (run.length >= MIN_PHRASE_WORDS) runs.push(...withoutVectors(run));
    run = [];
    gap = '';
  };
  lines.forEach((raw, index) => {
    // A marked line is not part of a phrase.
    if (raw.includes(IGNORE_MARKER)) {
      close();
      return;
    }
    let line = raw.replace(ESCAPED_SPACE, ' ');
    if (stripComments) line = line.replace(TRAILING_COMMENT, '');
    let last = 0;
    for (const match of line.matchAll(WORD)) {
      gap += line.slice(last, match.index);
      last = match.index + match[0].length;
      const word = match[0].toLowerCase();
      if (!PHRASE_GAP.test(gap) || !BIP39.has(word)) close();
      if (BIP39.has(word)) run.push({ word, line: index + 1 });
      gap = '';
    }
    gap += `${line.slice(last)}\n`;
  });
  close();
  return runs;
}

/** 1-based line of each offset in `text`. */
function lineOf(text, offset) {
  let line = 1;
  for (let i = text.indexOf('\n'); i !== -1 && i < offset; i = text.indexOf('\n', i + 1)) line += 1;
  return line;
}

/**
 * What in one file's text looks like wallet material.
 *
 * @returns One finding per line, `{ line, reason }`, line numbers 1-based.
 */
export function scanText(text) {
  const lines = text.split('\n');
  const found = new Map();
  for (const run of [...phraseRuns(lines), ...phraseRuns(lines, { stripComments: true })]) {
    found.set(run[0].line, `${MIN_PHRASE_WORDS}+ consecutive BIP39 words (a seed phrase?)`);
  }
  // A keypair array is often spread over many lines, so it is matched on the
  // whole text and reported on the line it opens; a marker on any of its lines
  // allows it.
  for (const match of text.matchAll(BYTE_ARRAY_KEYPAIR)) {
    const first = lineOf(text, match.index);
    const last = lineOf(text, match.index + match[0].length);
    if (lines.slice(first - 1, last).some((line) => line.includes(IGNORE_MARKER))) continue;
    if (!found.has(first)) found.set(first, '64-byte integer array (a keypair?)');
  }
  lines.forEach((line, index) => {
    if (found.has(index + 1) || line.includes(IGNORE_MARKER)) return;
    const named = KEY_NAME.test(line);
    let reason = null;
    if (BASE58_KEYPAIR.test(line)) reason = '64-byte base58 string (a keypair?)';
    else if (EXTENDED_PRIVATE_KEY.test(line)) reason = 'BIP32 extended private key';
    else if (PEM_PRIVATE_KEY.test(line)) reason = 'PEM private key';
    else if ([...line.matchAll(WIF_CANDIDATE)].some(([token]) => isWif(token))) {
      reason = 'Bitcoin WIF private key';
    } else if (named && HEX_KEY.test(line)) reason = 'hex key beside a key name';
    else if (
      named &&
      [...line.matchAll(BASE58_32_CANDIDATE)].some(([token]) => decodeBase58(token).length === 32)
    ) {
      reason = '32-byte base58 key beside a key name';
    }
    if (reason) found.set(index + 1, reason);
  });
  return [...found].sort(([a], [b]) => a - b).map(([line, reason]) => ({ line, reason }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: REPO,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((file) => file && !SKIP.test(file));

  const findings = [];
  for (const file of files) {
    const full = path.join(REPO, file);
    if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) continue;
    const text = fs.readFileSync(full, 'utf8');
    if (text.includes('\u0000')) continue; // binary
    for (const { line, reason } of scanText(text)) findings.push(`${file}:${line}: ${reason}`);
  }

  if (findings.length > 0) {
    console.error('check:no-secrets found wallet material in tracked files:\n');
    for (const finding of findings) console.error(`  ${finding}`);
    console.error(
      '\nSeed phrases and private keys never go in the repo, tests included. Move the value to a gitignored .env.test and read it from there.'
    );
    process.exit(1);
  }
  console.log(
    `check:no-secrets: ${files.length} files, nothing that looks like a seed phrase or a key`
  );
}
