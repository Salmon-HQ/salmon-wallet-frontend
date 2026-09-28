/**
 * SeedPhraseEntry — a recovery phrase typed one word per box, for the DOM.
 *
 * Replaces the single free-text field the recover screen used to have. A
 * phrase is twelve or twenty-four discrete words, and a textarea hid every
 * mistake that matters: a missing word, a transposed pair, a word the browser
 * "corrected". One box per word makes the count and the order visible, and
 * makes the boxes themselves the thing that has to be filled.
 *
 * The React Native twin is `apps/mobile/src/components/SeedPhrase`. The two
 * must not disagree about what a seed entry does, so the behaviour below
 * matches it exactly, and the part that is pure string handling —
 * `distributePhrase` — is one implementation in `@salmon/shared` rather than
 * two that drift.
 *
 * Interaction, in the order it is used:
 *
 * - **Space commits the word and moves to the next box.** The word stays where
 *   it was typed; only focus advances. This is what makes typing a phrase feel
 *   like typing a phrase rather than tabbing through a form.
 * - **Paste fills every box at once**, from any box or from the screen's paste
 *   button — both land in `fill`, so they cannot disagree.
 * - **Backspace in an empty box moves back** to the previous one, or the grid
 *   becomes a trap you can only escape with the mouse.
 *
 * Autocorrect, autocapitalisation, spellcheck and password-manager autofill
 * are off on every box (`SeedWordInput`), because each of them silently turns
 * a valid word into an invalid mnemonic while the box still looks right.
 *
 * The mobile grid also carries `useSecretScreen`, which blocks OS screen
 * capture. There is no DOM equivalent — a browser cannot stop a screenshot —
 * and nothing here pretends there is.
 */
import { spacing, useSeedPhraseEntryLogic } from '@salmon/shared';
import type { CSSProperties } from 'react';
import { SeedWordInput } from './SeedWordInput';
import type { SeedPhraseEntryProps } from './types';

const grid: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  width: '100%',
  // Both lengths centre in the reserved `body` band rather than top-packing,
  // so growing the grid to 24 does not move its first row.
  alignContent: 'center',
};

const cellFor = (columns: number, dense: boolean): CSSProperties => ({
  width: `${100 / columns}%`,
  padding: dense ? spacing.xxs : spacing.xs,
  boxSizing: 'border-box',
});

export function SeedPhraseEntry({
  words,
  onChange,
  onLengthChange,
  onPasteRejected,
  testID = 'recover',
}: SeedPhraseEntryProps): React.ReactElement {
  // Twenty-four words have to live in the band twelve live in: four columns
  // instead of three and a shorter box, rather than twice the rows. A grid
  // that grew would push the layout around, which is the jump the slot grid
  // exists to remove.
  const { dense, columns, setRef, focus, fill, handleChange, handleBackspace } =
    useSeedPhraseEntryLogic<HTMLInputElement>({
      words,
      onChange,
      onLengthChange,
      onPasteRejected,
    });

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !words[index] && index > 0) {
      event.preventDefault();
      handleBackspace(index);
    }
  };

  return (
    // `data-columns` is the grid's density, stated rather than inferred, so
    // both the unit tests and the Playwright suite can assert that
    // twenty-four words got denser rather than taller.
    <div style={grid} data-testid={`${testID}-word-grid`} data-columns={columns}>
      {words.map((word, index) => (
        <div
          key={index}
          style={cellFor(columns, dense)}
          data-testid={`${testID}-word-cell-${index + 1}`}
        >
          <SeedWordInput
            compact
            dense={dense}
            testID={`${testID}-word-input-${index + 1}`}
            position={index + 1}
            value={word}
            onChangeText={(text) => handleChange(index, text)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPasteText={fill}
            onSubmitEditing={() => focus(index + 1)}
            inputRef={setRef(index)}
          />
        </div>
      ))}
    </div>
  );
}
