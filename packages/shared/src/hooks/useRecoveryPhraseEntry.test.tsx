/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useRecoveryPhraseEntry } from './useRecoveryPhraseEntry';

// The BIP-39 test vector for all-zero entropy: public, and holds nothing.
const VALID =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const VALID_WORDS = VALID.split(' ');

describe('useRecoveryPhraseEntry', () => {
  it('starts with twelve empty boxes and nothing to complain about', () => {
    const { result } = renderHook(() => useRecoveryPhraseEntry());
    expect(result.current.words).toEqual(Array(12).fill(''));
    expect(result.current.isValidSeedPhrase).toBe(false);
    expect(result.current.showInvalid).toBe(false);
  });

  it('accepts a valid phrase typed word by word', () => {
    const { result } = renderHook(() => useRecoveryPhraseEntry());
    act(() => result.current.handleWords(VALID_WORDS.slice(0, 11).concat('')));
    expect(result.current.showInvalid).toBe(false);

    act(() => result.current.handleWords(VALID_WORDS));
    expect(result.current.isValidSeedPhrase).toBe(true);
    expect(result.current.phrase).toBe(VALID);
    expect(result.current.showInvalid).toBe(false);
  });

  it('flags a complete phrase that does not validate', () => {
    const { result } = renderHook(() => useRecoveryPhraseEntry());
    act(() => result.current.handleWords(Array(12).fill('abandon')));
    expect(result.current.isValidSeedPhrase).toBe(false);
    expect(result.current.showInvalid).toBe(true);
  });

  it('fills the boxes from a pasted phrase', () => {
    const { result } = renderHook(() => useRecoveryPhraseEntry());
    act(() => result.current.paste(`  ${VALID.toUpperCase()}\n`));
    expect(result.current.isValidSeedPhrase).toBe(true);
    expect(result.current.pastedCount).toBeNull();
  });

  it('reports the count of a paste that does not fit, until the boxes are edited', () => {
    const { result } = renderHook(() => useRecoveryPhraseEntry());
    act(() => result.current.paste('abandon abandon abandon'));
    expect(result.current.pastedCount).toBe(3);
    expect(result.current.showInvalid).toBe(true);

    act(() => result.current.handleWords(result.current.words));
    expect(result.current.pastedCount).toBeNull();
  });

  it('ignores an empty paste', () => {
    const { result } = renderHook(() => useRecoveryPhraseEntry());
    act(() => result.current.handleWords(VALID_WORDS));
    act(() => result.current.paste(''));
    expect(result.current.words).toEqual(VALID_WORDS);
  });

  it('grows to twenty-four boxes and shrinks back, keeping what was typed', () => {
    const { result } = renderHook(() => useRecoveryPhraseEntry());
    act(() => result.current.handleWords(VALID_WORDS));
    act(() => result.current.handleLength(24));
    expect(result.current.words).toEqual([...VALID_WORDS, ...Array(12).fill('')]);
    expect(result.current.isValidSeedPhrase).toBe(false);

    const before = result.current.words;
    act(() => result.current.handleLength(24));
    expect(result.current.words).toBe(before);

    act(() => result.current.handleLength(12));
    expect(result.current.words).toEqual(VALID_WORDS);
  });
});
