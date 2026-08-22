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
import Box from '@mui/material/Box';
import { distributePhrase, LONG_PHRASE, SHORT_PHRASE, spacing } from '@salmon/shared';
import { useCallback, useRef } from 'react';
import { styled } from '../../utils/styled';
import { SeedWordInput } from './SeedWordInput';
import type { SeedPhraseEntryProps } from './types';

const Grid = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  width: '100%',
  // Both lengths centre in the reserved `body` band rather than top-packing,
  // so growing the grid to 24 does not move its first row.
  alignContent: 'center',
});

const Cell = styled(Box)<{ $columns: number; $dense: boolean }>(({ $columns, $dense }) => ({
  width: `${100 / $columns}%`,
  padding: $dense ? spacing.xxs : spacing.xs,
  boxSizing: 'border-box',
}));

export function SeedPhraseEntry({
  words,
  onChange,
  onLengthChange,
  onPasteRejected,
  testID = 'recover',
}: SeedPhraseEntryProps): React.ReactElement {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Twenty-four words have to live in the band twelve live in: four columns
  // instead of three and a shorter box, rather than twice the rows. A grid
  // that grew would push the layout around, which is the jump the slot grid
  // exists to remove.
  const dense = words.length > SHORT_PHRASE;
  const columns = dense ? 4 : 3;

  const focus = useCallback((index: number) => {
    refs.current[index]?.focus();
  }, []);

  /**
   * Distributes a whole phrase across the boxes, growing the grid to 24 if
   * that is what was pasted. Both paste paths land here.
   */
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
      // More than one word arrived at once: that is a paste the browser let
      // through, wherever it landed, and it fills the grid rather than
      // stuffing one box.
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

  const handleKeyDown = useCallback(
    (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Backspace' && !words[index] && index > 0) {
        event.preventDefault();
        focus(index - 1);
      }
    },
    [focus, words]
  );

  return (
    // `data-columns` is the grid's density, stated rather than inferred: the
    // widths come from an emotion class, and both the unit tests and the
    // Playwright suite need to assert that twenty-four words got denser rather
    // than taller.
    <Grid data-testid={`${testID}-word-grid`} data-columns={columns}>
      {words.map((word, index) => (
        <Cell
          key={index}
          $columns={columns}
          $dense={dense}
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
            inputRef={(input: HTMLInputElement | null) => {
              refs.current[index] = input;
            }}
          />
        </Cell>
      ))}
    </Grid>
  );
}
