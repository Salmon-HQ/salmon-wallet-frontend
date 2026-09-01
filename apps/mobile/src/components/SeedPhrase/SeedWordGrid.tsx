/**
 * SeedWordGrid - Displays mnemonic words in a numbered grid
 */
import { View, Text, StyleSheet } from 'react-native';
import {
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  borderWidth,
  fontFamilyNative,
  type Semantic,
} from '@salmon/shared';
import { useSecretScreen } from '../../../hooks/useSecretScreen';
import { useThemedStyles } from '../../theme/useThemedStyles';

interface SeedWordGridProps {
  /** Array of mnemonic words */
  words: string[];
  /** Number of columns (default: 3) */
  columns?: number;
}

export function SeedWordGrid({ words, columns = 3 }: SeedWordGridProps) {
  // Rendering a mnemonic is by definition a secret surface, so protection
  // rides on this primitive rather than on each screen that uses it.
  useSecretScreen('seed-word-grid');
  const styles = useThemedStyles(stylesFor);

  return (
    <View style={styles.container}>
      {words.map((word, index) => (
        <View
          key={index}
          testID={`seed-word-cell-${index + 1}`}
          style={[styles.wordCard, { width: `${100 / columns - 2}%` }]}
        >
          <Text style={styles.wordIndex} accessibilityLabel={String(index + 1)}>
            {index + 1}
            <Text style={styles.indexDot}>.</Text>
          </Text>
          <Text style={styles.wordText}>{word}</Text>
        </View>
      ))}
    </View>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  // The Bedrock Rule (DESIGN.md): a cell that exhibits a seed word is
  // `surface.bedrock`, α 1.00 — never the translucent card that let the water
  // column read through the first phrase a user ever sees.
  wordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.surface.bedrock,
    borderWidth: borderWidth.thin,
    borderColor: t.border.raised,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  /**
   * The index's period. Decoration: the `accessibilityLabel` on the wrapping
   * `Text` is the bare number, so it is never announced, and it is markup that
   * never reaches the phrase. Nested inside the index's existing box so the
   * word beside it does not move.
   *
   * As in the entry cell, the number is `text.tertiary` (Seed Phrase Rule:
   * never mistakable for part of the phrase) and only the period carries the
   * accent.
   */
  indexDot: {
    color: t.accent.ink,
  },
  // Seed Phrase Rule (DESIGN.md): cell numbers are `text.tertiary` at label
  // size so they are never mistaken for part of the phrase.
  wordIndex: {
    color: t.text.tertiary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.label,
    minWidth: 20,
  },
  // Seed Phrase Rule: Geist Mono at the larger mono size, weight 500.
  wordText: {
    color: t.text.primary,
    fontFamily: fontFamilyNative.mono,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.monoLg,
  },
});
