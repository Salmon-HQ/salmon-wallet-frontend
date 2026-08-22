/**
 * TextButton - Text-only button without background
 *
 * Used for tertiary actions or links.
 */
import type { ReactNode } from 'react';
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
  /** Optional glyph rendered before the label. The label stays the accessible name. */
  icon?: ReactNode;
}

export function TextButton({
  onPress,
  children,
  disabled,
  loading,
  style,
  color,
  icon,
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
        <>
          {icon}
          <Text style={[styles.text, color ? { color } : undefined]}>{children}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: componentSizes.buttonHeightSmall,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
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
