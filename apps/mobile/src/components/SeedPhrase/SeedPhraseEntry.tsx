/**
 * SeedPhraseEntry — a recovery phrase typed one word per box.
 *
 * Replaces the single free-text field the recover screen used to have. A
 * phrase is twelve or twenty-four discrete words, and a textarea hid every
 * mistake that matters: a missing word, a transposed pair, a word the keyboard
 * "corrected". One box per word makes the count and the order visible, and
 * makes the boxes themselves the thing that has to be filled.
 *
 * Interaction, in the order it is used:
 *
 * - **Space commits the word and moves to the next box.** The word stays where
 *   it was typed; only focus advances. This is what makes typing a phrase feel
 *   like typing a phrase rather than tabbing through a form.
 * - **Paste fills every box at once**, from the grid or from the screen's paste
 *   button — both land here, so they cannot disagree.
 * - **Backspace in an empty box moves back** to the previous one, or the grid
 *   becomes a trap you can only escape by tapping.
 *
 * Autocorrect, autocapitalisation, predictive text and autofill are off on
 * every box (`SeedWordInput`), because each of them silently turns a valid
 * word into an invalid mnemonic while the box still looks right.
 *
 * Screenshot protection rides on `SeedWordInput`'s `useSecretScreen`, so it
 * cannot be lost by composing the boxes differently.
 */
import { useCallback, useRef } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import { distributePhrase, LONG_PHRASE, SHORT_PHRASE, spacing } from '@salmon/shared';

import { SeedWordInput } from './SeedWordInput';
import type { SeedPhraseEntryProps } from './types';

export type { SeedPhraseEntryProps };

export function SeedPhraseEntry({
  words,
  onChange,
  onLengthChange,
  onPasteRejected,
  testID = 'recover',
}: SeedPhraseEntryProps) {
  const refs = useRef<(TextInput | null)[]>([]);

  // Twenty-four words have to live in the band twelve live in: four columns
  // instead of three and a shorter box, rather than twice the rows. A grid
  // that grew would push the layout around, which is the jump this whole
  // change exists to remove.
  // ponytail: 24 lands at 276pt against 12's 208 — both inside the reserved
  // `body` band, so nothing outside the grid moves, but the two are not
  // pixel-identical. Closing the last 68 would take the box under a 44pt
  // touch target; do it only if the band itself ever gets tighter.
  const dense = words.length > SHORT_PHRASE;
  const columns = dense ? 4 : 3;

  const focus = useCallback((index: number) => {
    refs.current[index]?.focus();
  }, []);

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

  const handleKeyPress = useCallback(
    (index: number, key: string) => {
      if (key === 'Backspace' && !words[index] && index > 0) focus(index - 1);
    },
    [focus, words]
  );

  return (
    <View style={styles.grid}>
      {words.map((word, index) => (
        <View
          key={index}
          testID={`${testID}-word-cell-${index + 1}`}
          style={[styles.cell, dense && styles.denseCell, { width: `${100 / columns}%` }]}
        >
          <SeedWordInput
            compact
            dense={dense}
            testID={`${testID}-word-input-${index + 1}`}
            position={index + 1}
            value={word}
            onChangeText={(text) => handleChange(index, text)}
            onKeyPress={(event) => handleKeyPress(index, event.nativeEvent.key)}
            onSubmitEditing={() => focus(index + 1)}
            returnKeyType={index === words.length - 1 ? 'done' : 'next'}
            inputRef={(input) => {
              refs.current[index] = input;
            }}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    // Both lengths centre in the reserved band rather than top-packing, so
    // growing the grid to 24 does not move its first row.
    alignContent: 'center',
  },
  cell: {
    padding: spacing.xs,
  },
  denseCell: {
    padding: spacing.xxs,
  },
});
