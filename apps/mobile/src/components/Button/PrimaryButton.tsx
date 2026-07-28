/**
 * PrimaryButton - Main call-to-action button
 *
 * White background with dark text, used for primary actions.
 */
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { colors, componentSizes, fontFamilyNative, fontSize, letterSpacing, } from '@salmon/shared';
import type { Testable } from '@salmon/shared';

interface PrimaryButtonProps extends Testable {
  onPress: () => void;
  children: string;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function PrimaryButton({
  onPress,
  children,
  disabled,
  loading,
  style,
  testID,
}: PrimaryButtonProps) {
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
        <ActivityIndicator color={colors.button.primaryText} />
      ) : (
        <Text style={styles.text} numberOfLines={1} adjustsFontSizeToFit>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: componentSizes.buttonHeight,
    backgroundColor: colors.button.primaryBackground,
    borderRadius: componentSizes.buttonRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: colors.button.disabledOpacity,
  },
  text: {
    color: colors.button.primaryText,
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize.md,
    letterSpacing: letterSpacing.widest,
    // `adjustsFontSizeToFit` stretches the Text to the full button width, so
    // without an explicit center the label left-aligns (visible on short labels
    // like the swap "Confirm (13)" countdown).
    textAlign: 'center',
  },
});
