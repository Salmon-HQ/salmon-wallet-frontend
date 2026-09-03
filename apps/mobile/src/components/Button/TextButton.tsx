/**
 * TextButton - Text-only button without background
 *
 * Used for tertiary actions or links. `text.accent` ink per DESIGN.md
 * §Buttons — a ghost control that reads as body copy is not a control.
 */
import type { ReactNode } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import {
  componentSizes,
  fontFamilyNative,
  spacing,
  fontSize,
  letterSpacing,
  type Semantic,
} from '@salmon/shared';
import type { Testable } from '@salmon/shared';

import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';

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
  const styles = useThemedStyles(stylesFor);
  const { text } = useSemantic();

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
        <ActivityIndicator color={color || text.accent} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, color ? { color } : undefined]}>{children}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    button: {
      height: componentSizes.buttonHeightSmall,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
    },
    disabled: {
      opacity: t.state.disabledOpacity,
    },
    text: {
      color: t.text.accent,
      fontFamily: fontFamilyNative.semiBold,
      fontSize: fontSize.body,
      letterSpacing: letterSpacing.normal,
    },
  });
