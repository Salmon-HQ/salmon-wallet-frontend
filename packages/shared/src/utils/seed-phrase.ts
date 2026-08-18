/**
 * How a pasted recovery phrase lays out across one-word boxes.
 *
 * Cross-platform on purpose. Both seed-entry grids — the React Native one in
 * `apps/mobile` and the DOM one in `packages/ui` — and both paste paths (the
 * grid's own paste handler and the screen's "Paste your seed phrase" button)
 * go through these, so the four of them cannot end up disagreeing about what
 * pasting a phrase does. The logic is pure string handling with no DOM and no
 * React Native in it, which is the whole reason it can live here.
 *
 * Nothing here touches key material beyond laying it out: no logging, no
 * storage, no validation. `validateMnemonic` in `crypto/mnemonic` is still
 * what decides whether a phrase is real.
 *
 * @module utils/seed-phrase
 */

import { normalizeMnemonic } from '../crypto/mnemonic';

/** The two phrase lengths a wallet is recovered from in practice. */
export const SHORT_PHRASE = 12;
export const LONG_PHRASE = 24;

/**
 * Splits pasted text into words, tolerating newlines, tabs and double spaces.
 *
 * Lowercased by `normalizeMnemonic`, because BIP-39 words are lowercase and a
 * capitalised one is an invalid mnemonic the user cannot see the fault in —
 * the box looks right.
 */
export const splitPhrase = (text: string): string[] =>
  normalizeMnemonic(text).split(' ').filter(Boolean);

export interface DistributedPhrase {
  /** One entry per box, padded with empty strings. */
  words: string[];
  /** Whether what was pasted is a usable phrase length. */
  fits: boolean;
  /** How many words actually arrived, so a caller can say what happened. */
  count: number;
}

/**
 * Lays a pasted blob out across boxes.
 *
 * A count that is neither 12 nor 24 is still laid out as far as it goes —
 * throwing away what someone pasted is worse than showing them a short grid.
 * `fits` is false so the caller can say the phrase will not validate, and
 * `count` is what actually arrived so the caller can say *what happened*
 * rather than only that something is wrong.
 */
export const distributePhrase = (text: string): DistributedPhrase => {
  const pasted = splitPhrase(text);
  const length = pasted.length > SHORT_PHRASE ? LONG_PHRASE : SHORT_PHRASE;
  return {
    words: Array.from({ length }, (_, index) => pasted[index] ?? ''),
    fits: pasted.length === SHORT_PHRASE || pasted.length === LONG_PHRASE,
    count: pasted.length,
  };
};
