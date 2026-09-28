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
import { StyleSheet, View, type TextInput } from 'react-native';
import { spacing, useSeedPhraseEntryLogic } from '@salmon/shared';

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
  // Twenty-four words have to live in the band twelve live in: four columns
  // instead of three and a shorter box, rather than twice the rows. A grid
  // that grew would push the layout around, which is the jump this whole
  // change exists to remove.
  // ponytail: 24 lands at 276pt against 12's 208 — both inside the reserved
  // `body` band, so nothing outside the grid moves, but the two are not
  // pixel-identical. Closing the last 68 would take the box under a 44pt
  // touch target; do it only if the band itself ever gets tighter.
  const { dense, columns, setRef, focus, handleChange, handleBackspace } =
    useSeedPhraseEntryLogic<TextInput>({ words, onChange, onLengthChange, onPasteRejected });

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace') handleBackspace(index);
  };

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
            inputRef={setRef(index)}
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
