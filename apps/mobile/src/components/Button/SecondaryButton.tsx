/**
 * SecondaryButton - Secondary action button
 *
 * The outlined control: transparent fill, `border.raised` stroke, primary
 * ink. It carried an opaque slate fill, which read as a second filled
 * button competing with the salmon one beside it.
 */
import type { ReactNode } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  borderWidth,
  colors,
  componentSizes,
  fontFamilyNative,
  fontSize,
  letterSpacing,
  spacing,
  semantic,
} from '@salmon/shared';
import type { Testable } from '@salmon/shared';
import { PressSpecular } from '../PressSpecular';
import { usePressMotion } from '../../../hooks/usePressMotion';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface SecondaryButtonProps extends Testable {
  onPress: () => void;
  children: string;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  /** Optional glyph before the label. The label stays the accessible name. */
  icon?: ReactNode;
  /**
   * Optional glyph after the label — a caret when the control opens a picker
   * rather than acting directly.
   */
  trailingIcon?: ReactNode;
}

export function SecondaryButton({
  onPress,
  children,
  disabled,
  loading,
  style,
  icon,
  trailingIcon,
  testID,
}: SecondaryButtonProps) {
  const isDisabled = disabled || loading;
  const { pressStyle, pressHandlers, specular } = usePressMotion();

  return (
    <AnimatedTouchable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...pressHandlers}
      style={[styles.button, isDisabled && styles.disabled, style, pressStyle]}
    >
      {loading ? (
        <ActivityIndicator color={semantic.text.primary} />
      ) : (
        <>
          {icon}
          <Text style={styles.text}>{children}</Text>
          {trailingIcon}
        </>
      )}
      {!isDisabled && <PressSpecular {...specular} />}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: componentSizes.buttonHeight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'transparent',
    borderWidth: borderWidth.thin,
    borderColor: semantic.border.raised,
    borderRadius: componentSizes.buttonRadius,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    // Clip the press specular to the control's own radius.
    overflow: 'hidden',
  },
  disabled: {
    opacity: colors.button.disabledOpacity,
  },
  text: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize.bodyLg,
    letterSpacing: letterSpacing.normal,
    textAlign: 'center',
  },
});
