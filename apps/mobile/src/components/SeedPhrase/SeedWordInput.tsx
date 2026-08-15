/**
 * SeedWordInput - Input for validating a specific mnemonic word
 */
import { useTranslation } from 'react-i18next';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import {
  colors,
  spacing,
  componentSizes,
  fontSize,
  borderWidth,
  fontFamilyNative,
} from '@salmon/shared';
import type { Testable } from '@salmon/shared';
import { useSecretScreen } from '../../../hooks/useSecretScreen';

type ValidationState = 'idle' | 'correct' | 'incorrect';

interface SeedWordInputProps extends Testable {
  /** Word position (1-indexed) */
  position: number;
  /** Current input value */
  value: string;
  /** Change handler */
  onChangeText: (text: string) => void;
  /** Validation state */
  validationState?: ValidationState;
  /** Auto focus this input */
  autoFocus?: boolean;
  /** Called when user submits */
  onSubmitEditing?: () => void;
}

export function SeedWordInput({
  position,
  value,
  onChangeText,
  validationState = 'idle',
  autoFocus,
  onSubmitEditing,
  testID,
}: SeedWordInputProps) {
  const { t } = useTranslation();

  // A typed recovery word is worth as much as a displayed one.
  useSecretScreen('seed-word-input');

  const getBorderColor = () => {
    switch (validationState) {
      case 'correct':
        return colors.status.success;
      case 'incorrect':
        return colors.status.error;
      default:
        return colors.input.border;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('wallet.create.word_number', { position })}</Text>
      <TextInput
        testID={testID}
        accessibilityLabel={t('wallet.create.word_number', { position })}
        style={[styles.input, { borderColor: getBorderColor() }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={t('wallet.create.enter_word_number', { position })}
        placeholderTextColor={colors.text.tertiary}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="next"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  input: {
    width: '100%',
    minHeight: componentSizes.inputHeight,
    paddingVertical: spacing.xs,
    backgroundColor: colors.input.background,
    borderWidth: borderWidth.thin,
    borderRadius: componentSizes.inputRadius,
    paddingHorizontal: spacing.lg,
    color: colors.text.primary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.md,
  },
});
