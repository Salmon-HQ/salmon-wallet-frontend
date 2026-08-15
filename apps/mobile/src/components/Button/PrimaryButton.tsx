/**
 * PrimaryButton - Main call-to-action button
 *
 * A salmon fill carrying `accent.onFill` ink at 6.50:1 — the only legal ink
 * on a salmon fill. Disabled swaps the whole object to `surface.crest` with
 * disabled ink rather than dimming the fill: at 50% opacity the near-black
 * ink sat on a muddy red and read as neither alive nor disabled. The salmon
 * is either alive or absent — and so is the flesh inside it.
 */
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import {
  colors,
  componentSizes,
  fontFamilyNative,
  fontSize,
  letterSpacing,
  semantic,
} from '@salmon/shared';
import type { Testable } from '@salmon/shared';
import { FleshBackground } from '../FleshBackground';

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
      {/* The flesh: the myosepta of a cut fillet, pressed into the salmon
          fill. A filled button is mass, not surface, so the material it shows
          is the inside of the fish rather than its skin. Every band is paler
          than the fill, so the 6.50:1 ink composite is a floor here, not a
          budget. Absent when the fill is absent. */}
      {!isDisabled && <FleshBackground />}
      {loading ? (
        <ActivityIndicator
          color={isDisabled ? semantic.text.disabled : colors.button.primaryText}
        />
      ) : (
        <Text
          style={[styles.text, isDisabled && styles.textDisabled]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {children}
        </Text>
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
    // The flesh is drawn at absolute-fill; clip it to the pill's own radius.
    overflow: 'hidden',
  },
  disabled: {
    backgroundColor: semantic.surface.crest,
  },
  textDisabled: {
    color: semantic.text.disabled,
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
