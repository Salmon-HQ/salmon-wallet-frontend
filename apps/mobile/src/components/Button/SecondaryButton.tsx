/**
 * SecondaryButton - Secondary action button
 *
 * The outlined control: transparent fill, `border.raised` stroke, primary
 * ink. It carried an opaque slate fill, which read as a second filled
 * button competing with the salmon one beside it.
 */
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  borderWidth,
  componentSizes,
  fontFamilyNative,
  fontSize,
  letterSpacing,
  spacing,
  type Semantic,
} from '@salmon/shared';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { PressSpecular } from '../PressSpecular';
import { usePressMotion } from '../../../hooks/usePressMotion';

import type { SecondaryButtonProps } from './types';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function SecondaryButton({
  onPress,
  children,
  disabled,
  loading,
  tone = 'default',
  style,
  icon,
  trailingIcon,
  testID,
  accessibilityHint,
}: SecondaryButtonProps) {
  const isDisabled = disabled || loading;
  const isDanger = tone === 'danger';
  const isDangerFill = tone === 'danger-fill';
  const styles = useThemedStyles(stylesFor);
  const { text, status } = useSemantic();
  const { pressStyle, pressHandlers, specular } = usePressMotion();

  return (
    <AnimatedTouchable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...pressHandlers}
      style={[
        styles.button,
        isDanger && styles.buttonDanger,
        isDangerFill && styles.buttonDangerFill,
        isDisabled && styles.disabled,
        style,
        pressStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isDangerFill ? status.onFill : text.primary} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              isDanger && styles.textDanger,
              isDangerFill && styles.textOnDangerFill,
            ]}
          >
            {children}
          </Text>
          {trailingIcon}
        </>
      )}
      {!isDisabled && <PressSpecular {...specular} />}
    </AnimatedTouchable>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    button: {
      width: '100%',
      minHeight: componentSizes.buttonHeight,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      backgroundColor: 'transparent',
      borderWidth: borderWidth.thin,
      borderColor: t.border.raised,
      borderRadius: componentSizes.buttonRadius,
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      // Clip the press specular to the control's own radius.
      overflow: 'hidden',
    },
    buttonDanger: {
      borderColor: t.status.danger,
    },
    /**
     * The filled destructive control — a `danger-700` plane, not an outline.
     * Its label is `status.onFill` and nothing else: the fill is invariant, so
     * the only ink that clears AA on it in *both* modes is the light one
     * (`text.primary` is `neutral-850` in light and measures 2.69:1 there).
     * Pairing the two here rather than at the call site is what keeps a screen
     * from filling the plane and forgetting the ink.
     */
    buttonDangerFill: {
      backgroundColor: t.status.dangerFill,
      borderColor: t.status.dangerFill,
    },
    disabled: {
      opacity: t.state.disabledOpacity,
    },
    text: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.bold,
      fontSize: fontSize.bodyLg,
      letterSpacing: letterSpacing.normal,
      textAlign: 'center',
    },
    textDanger: {
      color: t.status.danger,
    },
    textOnDangerFill: {
      color: t.status.onFill,
    },
  });
