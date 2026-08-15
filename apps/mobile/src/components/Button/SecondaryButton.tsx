/**
 * SecondaryButton - Secondary action button
 *
 * Dark background with white text, used for secondary actions.
 */
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import {
  colors,
  componentSizes,
  fontFamilyNative,
  fontSize,
  letterSpacing,
  spacing,
  semantic,
} from '@salmon/shared';
import type { Testable } from '@salmon/shared';

interface SecondaryButtonProps extends Testable {
  onPress: () => void;
  children: string;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function SecondaryButton({
  onPress,
  children,
  disabled,
  loading,
  style,
  testID,
}: SecondaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[styles.button, isDisabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={semantic.text.primary} />
      ) : (
        <Text style={styles.text}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: componentSizes.buttonHeight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.button.secondaryBackground,
    borderRadius: componentSizes.buttonRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: colors.button.disabledOpacity,
  },
  text: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize.md,
    letterSpacing: letterSpacing.widest,
    textAlign: 'center',
  },
});
