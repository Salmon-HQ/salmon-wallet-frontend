/**
 * Every word below is a placeholder, not a BIP-39 word, and no arrangement of
 * them is a phrase. A test fixture that looks like a real recovery phrase is a
 * recovery phrase as far as anything scraping this repo is concerned.
 */
import { describe, expect, it } from 'vitest';
import { distributePhrase, splitPhrase, LONG_PHRASE, SHORT_PHRASE } from './seed-phrase';

const twelve = Array.from({ length: SHORT_PHRASE }, (_, i) => `placeholder${i + 1}`);
const twentyFour = Array.from({ length: LONG_PHRASE }, (_, i) => `placeholder${i + 1}`);

describe('splitPhrase', () => {
  it('tolerates newlines, tabs and runs of spaces', () => {
    expect(splitPhrase('  alpha\n\nbravo\t charlie   delta ')).toEqual([
      'alpha',
      'bravo',
      'charlie',
      'delta',
    ]);
  });

  it('lowercases, because a capitalised BIP-39 word is an invalid mnemonic', () => {
    expect(splitPhrase('Alpha BRAVO Charlie')).toEqual(['alpha', 'bravo', 'charlie']);
  });
});

describe('distributePhrase', () => {
  it('fills twelve boxes from a twelve-word paste', () => {
    const result = distributePhrase(twelve.join(' '));
    expect(result).toEqual({ words: twelve, fits: true, count: SHORT_PHRASE });
  });

  it('grows to twenty-four boxes from a twenty-four-word paste', () => {
    const result = distributePhrase(twentyFour.join('\n'));
    expect(result).toEqual({ words: twentyFour, fits: true, count: LONG_PHRASE });
  });

  it('keeps a short paste rather than discarding it, and says how many arrived', () => {
    // Throwing away what someone pasted is worse than a short grid, and the
    // count is what lets the screen say "you pasted 5 words".
    const result = distributePhrase('alpha bravo charlie delta echo');
    expect(result.count).toBe(5);
    expect(result.fits).toBe(false);
    expect(result.words).toHaveLength(SHORT_PHRASE);
    expect(result.words.slice(0, 5)).toEqual(['alpha', 'bravo', 'charlie', 'delta', 'echo']);
    expect(result.words.slice(5)).toEqual(Array<string>(7).fill(''));
  });

  it('lays a between-lengths paste into the twenty-four grid, still not fitting', () => {
    const result = distributePhrase(twelve.concat('placeholder13').join(' '));
    expect(result.count).toBe(13);
    expect(result.fits).toBe(false);
    expect(result.words).toHaveLength(LONG_PHRASE);
  });
});
