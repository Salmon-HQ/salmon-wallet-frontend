/**
 * The exhibition contract of the onboarding seed grid.
 *
 * This is the one moment a user is shown a phrase for the first time, so the
 * Bedrock Rule and the Seed Phrase Rule (DESIGN.md) are asserted here rather
 * than trusted to review: an opaque ground under the words, the rule's mono
 * treatment on the word, the label role on the number.
 *
 * No real or realistic phrase appears in this file. The fixtures are
 * placeholder tokens that are not BIP-39 words at all, so nothing here could
 * ever address a wallet.
 */
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

// The real barrel drags in @solana/kit, which jest-expo will not transform;
// the theme folder imports nothing the transform chokes on, so the real
// tokens stand in for it.
jest.mock('@salmon/shared', () => jest.requireActual('../../../test-utils/themeTokens'));

jest.mock('../../../hooks/useSecretScreen', () => ({
  useSecretScreen: jest.fn(),
}));

import { fontFamilyNative, fontSize, fontWeight, semantic } from '@salmon/shared';
import { useSecretScreen } from '../../../hooks/useSecretScreen';
import { SeedWordGrid } from './SeedWordGrid';

/** Obviously not a mnemonic — placeholder tokens, never BIP-39 words. */
const words = ['zzplaceholder1', 'zzplaceholder2', 'zzplaceholder3'];

const flat = (style: unknown) => StyleSheet.flatten(style) as Record<string, unknown>;

describe('SeedWordGrid', () => {
  it('paints the word cell on an opaque ground, never a translucent wash', () => {
    render(<SeedWordGrid words={words} />);

    const cell = flat(screen.getByTestId('seed-word-cell-1').props.style);

    expect(cell.backgroundColor).toBe(semantic.surface.bedrock);
    expect(String(cell.backgroundColor)).not.toMatch(/rgba/);
  });

  it('sets the word in the mono face at the rule size and weight', () => {
    render(<SeedWordGrid words={words} />);

    const word = flat(screen.getByText(words[0]).props.style);

    expect(word.fontFamily).toBe(fontFamilyNative.mono);
    expect(word.fontSize).toBe(fontSize.monoLg);
    expect(word.fontWeight).toBe(fontWeight.medium);
  });

  it('sets the cell number at label size so it is never read as part of the phrase', () => {
    render(<SeedWordGrid words={words} />);

    const index = flat(screen.getByLabelText('1').props.style);

    expect(index.fontSize).toBe(fontSize.label);
    expect(index.color).toBe(semantic.text.tertiary);
  });

  it('opts the grid into screen-capture protection', () => {
    render(<SeedWordGrid words={words} />);

    expect(useSecretScreen).toHaveBeenCalledWith('seed-word-grid');
  });
});
