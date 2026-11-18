/**
 * The recovery phrase as it is being entered, on both platforms: one entry per
 * box, the count of a paste that did not fit, and whether what is there is a
 * valid phrase.
 *
 * Reading the clipboard is the platform's own; it hands the text to `paste`,
 * which fills the boxes through the same `distributePhrase` an in-box paste
 * uses, so the button and the grid cannot behave differently.
 */
import { useCallback, useMemo, useState } from 'react';
import { normalizeMnemonic, validateMnemonic } from '../crypto/mnemonic';
import { SHORT_PHRASE, distributePhrase } from '../utils/seed-phrase';

export function useRecoveryPhraseEntry() {
  // Twelve to begin with; a paste or a thirteenth typed word grows it to
  // twenty-four.
  const [words, setWords] = useState<string[]>(() => Array<string>(SHORT_PHRASE).fill(''));
  // The count of what was actually pasted, so the screen can say what happened
  // rather than only that something is wrong. `null` means nothing was rejected.
  const [pastedCount, setPastedCount] = useState<number | null>(null);

  const phrase = useMemo(() => normalizeMnemonic(words.join(' ')), [words]);
  const isComplete = words.every((word) => word.length > 0);
  const isValidSeedPhrase = isComplete && validateMnemonic(phrase);

  const handleWords = useCallback((next: string[]) => {
    setWords(next);
    setPastedCount(null);
  }, []);

  const handleLength = useCallback((length: number) => {
    setWords((prev) =>
      prev.length === length ? prev : Array.from({ length }, (_, i) => prev[i] ?? '')
    );
  }, []);

  const paste = useCallback((text: string) => {
    if (!text) return;
    const { words: pasted, fits, count } = distributePhrase(text);
    setPastedCount(fits ? null : count);
    setWords(pasted);
  }, []);

  return {
    words,
    phrase,
    pastedCount,
    setPastedCount,
    isValidSeedPhrase,
    // Only once every box is filled — telling someone their phrase is invalid
    // while they are still typing it is noise.
    showInvalid: pastedCount !== null || (isComplete && !isValidSeedPhrase),
    handleWords,
    handleLength,
    paste,
  };
}
