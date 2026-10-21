// Fixtures for the wallet-material gate. Every phrase and key below is built
// at run time from random bytes or the public wordlist, so this file carries
// nothing the gate itself would flag.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';

import { scanText } from './check-no-secrets.mjs';

const { wordlist } = await import('@scure/bip39/wordlists/english.js');

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58(bytes) {
  let value = BigInt(`0x${Buffer.from(bytes).toString('hex') || '0'}`);
  let out = '';
  while (value > 0n) {
    out = ALPHABET[Number(value % 58n)] + out;
    value /= 58n;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    out = `1${out}`;
  }
  return out;
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest();

/** A Bitcoin WIF for a random key: version byte, key, optional compression flag, checksum. */
function wif(version, compressed) {
  const payload = Buffer.concat([
    Buffer.from([version]),
    randomBytes(32),
    compressed ? Buffer.from([1]) : Buffer.alloc(0),
  ]);
  return base58(Buffer.concat([payload, sha256(sha256(payload)).subarray(0, 4)]));
}

/** Twelve real BIP39 words that are not a public test vector. */
const phrase = () => wordlist.slice(300, 312);

const flagged = (text) => scanText(text).length > 0;

test('a phrase written one word per line is a finding', () => {
  assert.equal(flagged(phrase().join('\n')), true);
});

test('a phrase separated by commas and quotes is a finding', () => {
  assert.equal(
    flagged(
      `const words = [${phrase()
        .map((word) => `'${word}'`)
        .join(', ')}];`
    ),
    true
  );
});

test('a numbered phrase is a finding', () => {
  assert.equal(
    flagged(
      phrase()
        .map((word, i) => `${i + 1}. ${word}`)
        .join('\n')
    ),
    true
  );
});

test('eleven words are not a phrase', () => {
  assert.equal(flagged(phrase().slice(0, 11).join('\n')), false);
});

test('prose between the words breaks the run', () => {
  const words = phrase();
  assert.equal(
    flagged([...words.slice(0, 6), 'getBalance()', ...words.slice(6)].join('\n')),
    false
  );
});

test('the public test vectors pass, split over lines too', () => {
  const vector = [...Array(11).fill('abandon'), 'about'];
  assert.equal(flagged(vector.join('\n')), false);
  assert.equal(flagged([...Array(11).fill('test'), 'junk'].join(',\n')), false);
});

test('a line carrying the marker is skipped and breaks a run across lines', () => {
  const words = phrase();
  const text = [...words.slice(0, 6), '// no-secrets-ignore: fixture', ...words.slice(6)].join(
    '\n'
  );
  assert.equal(flagged(text), false);
});

test('a Bitcoin WIF is a finding, compressed or not, mainnet or testnet', () => {
  for (const [version, compressed] of [
    [0x80, false],
    [0x80, true],
    [0xef, true],
  ]) {
    assert.equal(flagged(`const key = '${wif(version, compressed)}';`), true);
  }
});

test('a WIF-shaped string whose checksum fails is not a finding', () => {
  const good = wif(0x80, true);
  const last = good.at(-1) === '1' ? '2' : '1';
  assert.equal(flagged(`const id = '${good.slice(0, -1)}${last}';`), false);
});

test('32- and 64-byte hex next to a key name are findings', () => {
  assert.equal(flagged(`privateKey: '0x${randomBytes(32).toString('hex')}',`), true);
  assert.equal(flagged(`const secretKey = "${randomBytes(64).toString('hex')}";`), true);
});

test('hex with no key name beside it, such as a transaction hash, is not a finding', () => {
  assert.equal(flagged(`txHash: '0x${randomBytes(32).toString('hex')}',`), false);
  assert.equal(flagged(`signature: '${randomBytes(64).toString('hex')}',`), false);
});

test('a 32-byte base58 secret key is a finding', () => {
  assert.equal(flagged(`secretKey: '${base58(randomBytes(32))}',`), true);
});

test('a base58 address, the same shape as a 32-byte key, is not a finding', () => {
  assert.equal(flagged(`address: '${base58(randomBytes(32))}',`), false);
});

test('a 64-byte keypair stays a finding in base58 and as a byte array', () => {
  assert.equal(flagged(`'${base58(randomBytes(64))}'`), true);
  assert.equal(flagged(`[${Array.from(randomBytes(64)).join(', ')}]`), true);
});

test('a finding names its line', () => {
  assert.deepEqual(
    scanText(`ok\nprivateKey: '${randomBytes(32).toString('hex')}'`).map(({ line }) => line),
    [2]
  );
});
