/**
 * TextButton - Text-only button without background
 *
 * Used for tertiary actions or links.
 */
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import {
  colors,
  componentSizes,
  fontFamilyNative,
  spacing,
  fontSize,
  letterSpacing,
} from '@salmon/shared';
import type { Testable } from '@salmon/shared';

interface TextButtonProps extends Testable {
  onPress: () => void;
  children: string;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  color?: string;
}

export function TextButton({
  onPress,
  children,
  disabled,
  loading,
  style,
  color,
  testID,
}: TextButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.6}
      style={[styles.button, isDisabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={color || colors.text.primary} />
      ) : (
        <Text style={[styles.text, color ? { color } : undefined]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: componentSizes.buttonHeightSmall,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  disabled: {
    opacity: colors.button.disabledOpacity,
  },
  text: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.base,
    letterSpacing: letterSpacing.wider,
  },
});
