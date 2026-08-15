/**
 * SeedWordGrid - Displays mnemonic words in a numbered grid
 */
import { View, Text, StyleSheet } from 'react-native';
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  borderWidth,
  fontFamilyNative,
} from '@salmon/shared';
import { useSecretScreen } from '../../../hooks/useSecretScreen';

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

  return (
    <View style={styles.container}>
      {words.map((word, index) => (
        <View key={index} style={[styles.wordCard, { width: `${100 / columns - 2}%` }]}>
          <Text style={styles.wordIndex}>{index + 1}</Text>
          <Text style={styles.wordText}>{word}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  wordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.background,
    borderWidth: borderWidth.thin,
    borderColor: colors.card.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  wordIndex: {
    color: colors.accent.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize.sm,
    minWidth: 20,
  },
  wordText: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.mono,
    fontSize: fontSize.base,
  },
});
