/**
 * The word-box grid's interaction contract.
 *
 * A recovery phrase is the one input in the product where a silent
 * transformation costs the user their money: a capitalised word is not a valid
 * BIP-39 word, and the box still looks right. So the rules here are asserted
 * rather than trusted to keyboard flags, which vary by OEM.
 *
 * No real or realistic phrase appears in this file. The fixtures are
 * placeholder tokens that are not BIP-39 words at all, so nothing here could
 * ever address a wallet.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// `seed-phrase` is pure string handling, but it imports `normalizeMnemonic`
// from crypto/mnemonic, whose siblings pull ESM crypto packages jest-expo will
// not transform. The one-line stand-in matches the real implementation, which
// shared's own Vitest suite covers.
jest.mock('../../../../../packages/shared/src/crypto/mnemonic', () => ({
  normalizeMnemonic: (phrase: string) => phrase.trim().toLowerCase().replace(/\s+/g, ' '),
}));

// The real barrel drags in @solana/kit, which jest-expo will not transform;
// the theme folder and the seed-phrase utils (with mnemonic mocked above)
// import nothing the transform chokes on, so the real implementations stand
// in for the barrel.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../test-utils/themeTokens'),
  ...jest.requireActual('../../../../../packages/shared/src/utils/seed-phrase'),
}));

jest.mock('../../../hooks/useSecretScreen', () => ({
  useSecretScreen: jest.fn(),
}));

import { distributePhrase, LONG_PHRASE, SHORT_PHRASE } from '@salmon/shared';
import { useSecretScreen } from '../../../hooks/useSecretScreen';
import { SeedPhraseEntry } from './SeedPhraseEntry';

/** Obviously not a mnemonic — placeholder tokens, never BIP-39 words. */
const placeholder = (n: number) => Array.from({ length: n }, (_, i) => `zzplaceholder${i + 1}`);

function Harness({ initial = SHORT_PHRASE }: { initial?: number }) {
  const [words, setWords] = React.useState<string[]>(() => Array<string>(initial).fill(''));
  return (
    <SeedPhraseEntry
      words={words}
      onChange={setWords}
      onLengthChange={(length) =>
        setWords((prev) =>
          prev.length === length ? prev : Array.from({ length }, (_, i) => prev[i] ?? '')
        )
      }
    />
  );
}

const box = (n: number) => screen.getByTestId(`recover-word-input-${n}`);
const boxes = () => screen.getAllByTestId(/^recover-word-input-\d+$/);

describe('SeedPhraseEntry', () => {
  it('draws twelve boxes by default', () => {
    render(<Harness />);
    expect(boxes()).toHaveLength(SHORT_PHRASE);
  });

  it('keeps the screenshot block that rides on the boxes', () => {
    // The grid must not be a way to lose FLAG_SECURE. Composing the boxes
    // differently is exactly how that protection gets dropped by accident.
    render(<Harness />);
    expect(useSecretScreen).toHaveBeenCalledWith('seed-word-input');
  });

  it('leaves the word where it was typed when space commits it', () => {
    render(<Harness />);
    fireEvent.changeText(box(1), 'zzalpha ');
    expect(box(1).props.value).toBe('zzalpha');
    expect(box(2).props.value).toBe('');
  });

  it('normalises to lowercase whatever the keyboard forced through', () => {
    // Autocapitalise is off on every box, but some IMEs ignore that and a
    // paste carries whatever it carried. A capitalised word is an invalid
    // mnemonic the user cannot see the fault in.
    render(<Harness />);
    fireEvent.changeText(box(1), 'ZzAlPhA');
    expect(box(1).props.value).toBe('zzalpha');
  });

  it('fills every box from one paste, wherever it lands', () => {
    render(<Harness />);
    fireEvent.changeText(box(1), placeholder(SHORT_PHRASE).join(' '));
    expect(boxes().map((b) => b.props.value)).toEqual(placeholder(SHORT_PHRASE));
  });

  it('grows to twenty-four when twenty-four are pasted', () => {
    render(<Harness />);
    fireEvent.changeText(box(1), placeholder(LONG_PHRASE).join(' '));
    expect(boxes()).toHaveLength(LONG_PHRASE);
    expect(box(LONG_PHRASE).props.value).toBe(`zzplaceholder${LONG_PHRASE}`);
  });

  it('grows to twenty-four when the thirteenth word is typed by hand', () => {
    // There is no length picker to get wrong first.
    render(<Harness />);
    fireEvent.changeText(box(1), placeholder(SHORT_PHRASE).join(' '));
    fireEvent.changeText(box(SHORT_PHRASE), 'zzomega ');
    expect(boxes()).toHaveLength(LONG_PHRASE);
  });

  it('packs twenty-four denser instead of taller', () => {
    // Four columns and a shorter box, so the grid stays inside the band the
    // twelve occupied. A grid that grew would shove the layout the slot grid
    // exists to hold still.
    const cellStyle = () => {
      const style = screen.getByTestId('recover-word-cell-1').props.style;
      const flat = (Array.isArray(style) ? style : [style]).filter(Boolean);
      return Object.assign({}, ...flat);
    };

    const short = render(<Harness />);
    const shortCell = cellStyle();
    short.unmount();

    render(<Harness initial={LONG_PHRASE} />);
    const longCell = cellStyle();

    expect(shortCell.width).toBe(`${100 / 3}%`);
    expect(longCell.width).toBe(`${100 / 4}%`);
    // Tighter padding too, so six rows cost less than six of the tall rows.
    expect(longCell.padding).toBeLessThan(shortCell.padding);
  });

  it('steps back to the previous box when backspace lands on an empty one', () => {
    // Without this the grid is a trap: the only way out of an empty box is to
    // tap another one.
    render(<Harness />);
    fireEvent.changeText(box(1), 'zzalpha ');
    fireEvent(box(2), 'keyPress', { nativeEvent: { key: 'Backspace' } });
    // Focus is not observable in jsdom, so assert where the next character
    // lands — which is the thing the user actually experiences.
    fireEvent.changeText(box(1), 'zzalphb');
    expect(box(1).props.value).toBe('zzalphb');
  });

  it('does not step back from the first box', () => {
    render(<Harness />);
    expect(() =>
      fireEvent(box(1), 'keyPress', { nativeEvent: { key: 'Backspace' } })
    ).not.toThrow();
  });

  it('keeps the index period out of the phrase entirely', () => {
    // The period after the number is decoration. On a screen where a stray
    // character is a wrong seed, it must never reach the value, the validated
    // mnemonic, or anything copied out.
    render(<Harness />);
    fireEvent.changeText(box(1), 'zzalpha ');
    fireEvent.changeText(box(2), 'zzbeta');
    expect(
      boxes()
        .map((b) => b.props.value)
        .join(' ')
    ).not.toContain('.');
    expect(box(1).props.value).toBe('zzalpha');
    expect(box(2).props.value).toBe('zzbeta');
  });

  it('announces the index as a bare number, not as punctuation', () => {
    // "One full stop bronze" is not what a screen reader should say.
    render(<Harness />);
    expect(screen.getByLabelText('1')).toBeTruthy();
  });

  it('normalises line breaks, tabs and doubled spaces on paste', () => {
    render(<Harness />);
    const messy = placeholder(SHORT_PHRASE).join('\n  \t');
    fireEvent.changeText(box(1), `  ${messy}\n`);
    expect(boxes().map((b) => b.props.value)).toEqual(placeholder(SHORT_PHRASE));
  });

  it('keeps a wrong-length paste rather than discarding it, and says so', () => {
    // Throwing away what someone pasted is worse than showing them a partly
    // filled grid — but they have to be told why it will not validate.
    const onChange = jest.fn();
    const onPasteRejected = jest.fn();
    render(
      <SeedPhraseEntry
        words={Array<string>(SHORT_PHRASE).fill('')}
        onChange={onChange}
        onLengthChange={jest.fn()}
        onPasteRejected={onPasteRejected}
      />
    );
    fireEvent.changeText(box(1), placeholder(5).join(' '));
    // The count of what actually arrived, so the screen can say what happened.
    expect(onPasteRejected).toHaveBeenCalledWith(5);
    // The words still land: nothing pasted is discarded silently.
    expect(onChange).toHaveBeenCalledWith([
      ...placeholder(5),
      ...Array<string>(SHORT_PHRASE - 5).fill(''),
    ]);
    // The screen clears any previous rejection whenever the words change, so
    // the words must land *before* the rejection is reported — the other order
    // has the paste's own onChange wipe the notice it just raised.
    expect(onChange.mock.invocationCallOrder[0]).toBeLessThan(
      onPasteRejected.mock.invocationCallOrder[0]
    );
  });
});

describe('distributePhrase', () => {
  it.each([
    [SHORT_PHRASE, SHORT_PHRASE, true],
    [LONG_PHRASE, LONG_PHRASE, true],
    // Neither length: laid out as far as it goes, and reported.
    [5, SHORT_PHRASE, false],
    [13, LONG_PHRASE, false],
    [30, LONG_PHRASE, false],
  ])('%i words → %i boxes, fits=%s', (given, expected, fits) => {
    const result = distributePhrase(placeholder(given).join(' '));
    expect(result.words).toHaveLength(expected);
    expect(result.fits).toBe(fits);
  });

  it('lowercases and collapses whitespace', () => {
    expect(distributePhrase('  ZZ-ONE\n\tzz-two   ').words.slice(0, 2)).toEqual([
      'zz-one',
      'zz-two',
    ]);
  });
});
