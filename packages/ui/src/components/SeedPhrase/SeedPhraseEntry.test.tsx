/**
 * @vitest-environment jsdom
 *
 * Every word below is a placeholder, not a BIP-39 word, and no arrangement of
 * them is a phrase. A fixture that looks like a real recovery phrase is a real
 * recovery phrase as far as anything scraping this repo is concerned.
 *
 * What is asserted is the behaviour the two platforms must agree on: space
 * advances without moving the word, backspace returns, a paste fills every box
 * from any of them, a wrong-length paste is kept rather than discarded, and
 * twenty-four words get a denser grid rather than a taller one.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The root `@salmon/shared` barrel reaches React Native, which Vite cannot
// parse. The theme subtree and the seed-phrase utils are both pure, so they
// stand in for the barrel and the real `distributePhrase` is exercised.
vi.mock('@salmon/shared', async () => {
  const theme = await import('../../../../shared/src/theme');
  const seedPhrase = await import('../../../../shared/src/utils/seed-phrase');
  return { ...theme, ...seedPhrase };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => `${key}${values?.position ?? ''}`,
  }),
}));

import { SeedPhraseEntry } from './SeedPhraseEntry';

const twelve = () => Array<string>(12).fill('');
const box = (position: number) => screen.getByTestId(`recover-word-input-${position}`);

/** Renders with the word list held in a closure, the way the screen does. */
function setup(initial = twelve()) {
  let words = initial;
  const onPasteRejected = vi.fn();
  const view = render(
    <SeedPhraseEntry
      words={words}
      onChange={(next) => {
        words = next;
        view.rerender(harness());
      }}
      onLengthChange={(length) => {
        if (words.length !== length) {
          words = Array.from({ length }, (_, i) => words[i] ?? '');
        }
        view.rerender(harness());
      }}
      onPasteRejected={onPasteRejected}
    />
  );
  function harness() {
    return (
      <SeedPhraseEntry
        words={words}
        onChange={(next) => {
          words = next;
          view.rerender(harness());
        }}
        onLengthChange={(length) => {
          if (words.length !== length) {
            words = Array.from({ length }, (_, i) => words[i] ?? '');
            view.rerender(harness());
          }
        }}
        onPasteRejected={onPasteRejected}
      />
    );
  }
  return { onPasteRejected, current: () => words };
}

afterEach(cleanup);

describe('SeedPhraseEntry', () => {
  it('draws twelve boxes in three columns by default', () => {
    setup();
    expect(screen.getAllByTestId(/^recover-word-input-\d+$/)).toHaveLength(12);
    expect(screen.getByTestId('recover-word-grid').dataset.columns).toBe('3');
  });

  it('keeps the word where it was typed and moves focus on space', () => {
    const { current } = setup();
    fireEvent.change(box(1), { target: { value: 'placeholderone ' } });

    expect(current()[0]).toBe('placeholderone');
    expect(document.activeElement).toBe(box(2));
  });

  it('lowercases on input, because a capitalised word is an invalid mnemonic', () => {
    const { current } = setup();
    fireEvent.change(box(1), { target: { value: 'PlaceHolder' } });
    expect(current()[0]).toBe('placeholder');
  });

  it('returns to the previous box on backspace in an empty one', () => {
    setup();
    box(3).focus();
    fireEvent.keyDown(box(3), { key: 'Backspace' });
    expect(document.activeElement).toBe(box(2));
  });

  it('stays put on backspace when the box still has a word in it', () => {
    const words = twelve();
    words[2] = 'placeholder';
    setup(words);
    box(3).focus();
    fireEvent.keyDown(box(3), { key: 'Backspace' });
    expect(document.activeElement).toBe(box(3));
  });

  it('fills every box from a paste into any one of them', () => {
    const { current } = setup();
    const pasted = Array.from({ length: 12 }, (_, i) => `placeholder${i + 1}`);
    fireEvent.paste(box(5), {
      clipboardData: { getData: () => pasted.join('  \n ') },
    });
    expect(current()).toEqual(pasted);
  });

  it('grows to a denser twenty-four grid rather than a taller one', () => {
    const { current } = setup();
    const pasted = Array.from({ length: 24 }, (_, i) => `placeholder${i + 1}`);
    fireEvent.paste(box(1), { clipboardData: { getData: () => pasted.join(' ') } });

    expect(current()).toHaveLength(24);
    expect(screen.getAllByTestId(/^recover-word-input-\d+$/)).toHaveLength(24);
    // Four columns instead of three: the same band holds twice the boxes.
    expect(screen.getByTestId('recover-word-grid').dataset.columns).toBe('4');
  });

  it('keeps a wrong-length paste and reports how many words arrived', () => {
    const { current, onPasteRejected } = setup();
    fireEvent.paste(box(1), {
      clipboardData: { getData: () => 'alpha bravo charlie delta echo' },
    });

    expect(onPasteRejected).toHaveBeenCalledWith(5);
    expect(current().slice(0, 5)).toEqual(['alpha', 'bravo', 'charlie', 'delta', 'echo']);
    expect(current()).toHaveLength(12);
  });

  it('renders the index and its salmon period without putting either in the value', () => {
    const { current } = setup();
    // Decoration: the period is markup, aria-hidden, and never reaches the
    // mnemonic that gets validated or stored.
    const index = screen.getByLabelText('1');
    expect(index.textContent).toBe('1.');
    expect(index.querySelector('[aria-hidden="true"]')?.textContent).toBe('.');
    expect(current()[0]).toBe('');
  });
});
