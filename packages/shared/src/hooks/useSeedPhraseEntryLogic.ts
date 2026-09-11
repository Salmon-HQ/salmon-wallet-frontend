/**
 * useSeedPhraseEntryLogic — the word-grid state machine shared by the mobile
 * and DOM `SeedPhraseEntry` twins (a recovery phrase typed one word per box).
 *
 * Owns the density/column math, the per-word refs, focus advancement, paste
 * handling (`distributePhrase`, already a `@salmon/shared` util), the
 * space-commits-a-word behavior, and the backspace-in-an-empty-box-moves-back
 * behavior — all of it platform-independent, since both `TextInput` (React
 * Native) and `HTMLInputElement` (DOM) expose `.focus()`. Nothing here reads
 * or clears key material; it only rearranges words already held by the
 * caller's own state.
 *
 * Each platform still owns its own JSX (`View`/`div`, `onKeyPress` vs
 * `onKeyDown`) and passes through its native keyboard event's key string.
 *
 * @module hooks/useSeedPhraseEntryLogic
 */

import { useCallback, useRef } from 'react';
import { distributePhrase, LONG_PHRASE, SHORT_PHRASE } from '../utils/seed-phrase';

/** The minimum a platform ref needs: something you can call `.focus()` on. */
export interface FocusableRef {
  focus: () => void;
}

export interface UseSeedPhraseEntryLogicParams {
  words: string[];
  onChange: (words: string[]) => void;
  onLengthChange: (length: number) => void;
  onPasteRejected?: (count: number) => void;
}

export interface UseSeedPhraseEntryLogicResult<TRef extends FocusableRef> {
  /** Whether the grid is showing the 24-word (denser) layout. */
  dense: boolean;
  /** 4 columns when dense, 3 otherwise. */
  columns: number;
  /** Ref callback: pass to each box's `inputRef` prop at its index. */
  setRef: (index: number) => (ref: TRef | null) => void;
  /** Moves focus to the box at `index`, if it exists. */
  focus: (index: number) => void;
  /** Distributes a whole pasted phrase across the boxes. */
  fill: (text: string) => void;
  /** Call from the box's change handler with its index and new text. */
  handleChange: (index: number, text: string) => void;
  /** Call from the box's key handler when `key === 'Backspace'` fires; moves
   *  focus back a box when the current one is already empty. */
  handleBackspace: (index: number) => void;
}

export function useSeedPhraseEntryLogic<TRef extends FocusableRef>({
  words,
  onChange,
  onLengthChange,
  onPasteRejected,
}: UseSeedPhraseEntryLogicParams): UseSeedPhraseEntryLogicResult<TRef> {
  const refs = useRef<(TRef | null)[]>([]);

  // Twenty-four words have to live in the band twelve live in: four columns
  // instead of three and a shorter box, rather than twice the rows.
  const dense = words.length > SHORT_PHRASE;
  const columns = dense ? 4 : 3;

  const focus = useCallback((index: number) => {
    refs.current[index]?.focus();
  }, []);

  const setRef = useCallback(
    (index: number) => (ref: TRef | null) => {
      refs.current[index] = ref;
    },
    []
  );

  /** Distributes a whole phrase across the boxes, growing the grid to 24 if
   * that is what was pasted. */
  const fill = useCallback(
    (text: string) => {
      const { words: filled, fits, count } = distributePhrase(text);
      onLengthChange(filled.length);
      onChange(filled);
      // Reported *after* `onChange`, not before. The screen clears any previous
      // rejection whenever the words change — that is what makes the notice go
      // away as soon as someone starts fixing it — so reporting first would
      // have the paste's own `onChange` immediately wipe the message it just
      // raised, and a short paste would land silently.
      if (!fits) onPasteRejected?.(count);
    },
    [onChange, onLengthChange, onPasteRejected]
  );

  const handleChange = useCallback(
    (index: number, text: string) => {
      // More than one word arrived at once: that is a paste, wherever it
      // landed, and it fills the grid rather than stuffing one box.
      if (/\s/.test(text.trim())) {
        fill(text);
        return;
      }

      // A trailing space is the commit gesture. The word stays in this box.
      if (text.endsWith(' ')) {
        const next = words.slice();
        next[index] = text.trim();
        // Typing past the twelfth word is how a 24-word phrase is entered by
        // hand; there is no length picker to get wrong first.
        if (index === words.length - 1 && words.length === SHORT_PHRASE && next[index]) {
          onChange([...next, ...Array<string>(LONG_PHRASE - SHORT_PHRASE).fill('')]);
          onLengthChange(LONG_PHRASE);
        } else {
          onChange(next);
        }
        focus(index + 1);
        return;
      }

      const next = words.slice();
      next[index] = text;
      onChange(next);
    },
    [fill, focus, onChange, onLengthChange, words]
  );

  const handleBackspace = useCallback(
    (index: number) => {
      if (!words[index] && index > 0) focus(index - 1);
    },
    [focus, words]
  );

  return { dense, columns, setRef, focus, fill, handleChange, handleBackspace };
}
