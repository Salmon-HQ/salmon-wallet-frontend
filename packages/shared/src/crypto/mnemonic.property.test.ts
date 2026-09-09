import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { entropyToMnemonic, mnemonicToEntropy } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { normalizeMnemonic, validateMnemonic } from './mnemonic';

const RUNS = { numRuns: 200 };

/** Whitespace a phrase can pick up when pasted out of a document or a PDF. */
const whitespace = fc.string({
  unit: fc.constantFrom(' ', '\t', '\n', '\r', ' ', '  '),
  minLength: 1,
  maxLength: 3,
});

const word = fc.constantFrom(...wordlist);

/** 16 bytes = a 12-word phrase, 32 bytes = a 24-word phrase. */
const entropy = fc.oneof(
  fc.uint8Array({ minLength: 16, maxLength: 16 }),
  fc.uint8Array({ minLength: 32, maxLength: 32 })
);

/** Mangles the case of a phrase the way a user's keyboard or clipboard can. */
const recase = (phrase: string, flags: boolean[]): string =>
  phrase
    .split('')
    .map((c, i) => (flags[i % flags.length] ? c.toUpperCase() : c))
    .join('');

describe('mnemonic normalization property invariants', () => {
  it('is idempotent', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const once = normalizeMnemonic(s);
        expect(normalizeMnemonic(once)).toBe(once);
      }),
      RUNS
    );
  });

  it('collapses any whitespace between words to the canonical single space', () => {
    fc.assert(
      fc.property(
        fc.array(word, { minLength: 2, maxLength: 24 }),
        fc.array(whitespace, { minLength: 1, maxLength: 5 }),
        whitespace,
        whitespace,
        (words, separators, lead, trail) => {
          const messy =
            lead +
            words.map((w, i) => (i === 0 ? w : separators[i % separators.length] + w)).join('') +
            trail;
          expect(normalizeMnemonic(messy)).toBe(words.join(' '));
        }
      ),
      RUNS
    );
  });

  it('recovers a real phrase from any case and spacing a paste can introduce', () => {
    // The import screen accepts what the user pasted, not what we wish they had.
    fc.assert(
      fc.property(entropy, fc.array(fc.boolean(), { minLength: 1, maxLength: 8 }), (e, flags) => {
        const phrase = entropyToMnemonic(e, wordlist);
        const mangled = recase(phrase, flags).replace(/ /g, '\t \n');
        expect(validateMnemonic(normalizeMnemonic(mangled))).toBe(true);
      }),
      RUNS
    );
  });
});

describe('BIP39 checksum property invariants', () => {
  it('validates every phrase built from real entropy and returns that entropy', () => {
    fc.assert(
      fc.property(entropy, (e) => {
        const phrase = entropyToMnemonic(e, wordlist);
        expect(validateMnemonic(phrase)).toBe(true);
        expect(mnemonicToEntropy(phrase, wordlist)).toEqual(e);
      }),
      RUNS
    );
  });

  it('never silently accepts a swapped word as the same wallet', () => {
    // A 12-word checksum is only 4 bits, so ~1 in 16 single-word typos still
    // passes validation. What must never happen is a typo that validates AND
    // maps back to the original entropy — that would restore a wallet the user
    // did not write down.
    fc.assert(
      fc.property(
        entropy,
        fc.nat(),
        fc.integer({ min: 1, max: wordlist.length - 1 }),
        (e, positionSeed, shift) => {
          const words = entropyToMnemonic(e, wordlist).split(' ');
          const position = positionSeed % words.length;
          const current = wordlist.indexOf(words[position]);
          words[position] = wordlist[(current + shift) % wordlist.length];
          const flipped = words.join(' ');

          if (!validateMnemonic(flipped)) return;
          expect(mnemonicToEntropy(flipped, wordlist)).not.toEqual(e);
        }
      ),
      RUNS
    );
  });
});
