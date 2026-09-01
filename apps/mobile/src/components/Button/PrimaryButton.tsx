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
import Animated from 'react-native-reanimated';
import {
  componentSizes,
  fontFamilyNative,
  fontSize,
  letterSpacing,
  shadowsCSS,
  type Semantic,
} from '@salmon/shared';
import type { Testable } from '@salmon/shared';

import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { FleshBackground } from '../FleshBackground';
import { PressSpecular } from '../PressSpecular';
import { usePressMotion } from '../../../hooks/usePressMotion';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

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
  const styles = useThemedStyles(stylesFor);
  const { text, accent } = useSemantic();
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
      {/* The flesh: the myosepta of a cut fillet, pressed into the salmon
          fill. A filled button is mass, not surface, so the material it shows
          is the inside of the fish rather than its skin. Every band is paler
          than the fill, so the 6.50:1 ink composite is a floor here, not a
          budget. Absent when the fill is absent. */}
      {!isDisabled && <FleshBackground scale={componentSizes.buttonFleshScale} />}
      {loading ? (
        <ActivityIndicator color={isDisabled ? text.disabled : accent.onFill} />
      ) : (
        <Text
          style={[styles.text, isDisabled && styles.textDisabled]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {children}
        </Text>
      )}
      {/* The specular is drawn last so it sits over the flesh, and the pill's
          `overflow: 'hidden'` clips it to the control's own radius. */}
      {!isDisabled && <PressSpecular {...specular} />}
    </AnimatedTouchable>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    button: {
      width: '100%',
      height: componentSizes.buttonHeight,
      backgroundColor: t.accent.fill,
      borderRadius: componentSizes.buttonRadius,
      alignItems: 'center',
      justifyContent: 'center',
      // The flesh is drawn at absolute-fill; clip it to the pill's own radius.
      overflow: 'hidden',
      // The same bezel string the DOM half uses. React Native parses CSS
      // box-shadow syntax since the new renderer and clips inset shadows to the
      // view's border radius, so no 1px overlay views are needed and the two
      // platforms cannot drift. Android draws inset shadows from API 29 up; below
      // that the bezel is simply absent.
      boxShadow: shadowsCSS.bezel,
    },
    disabled: {
      backgroundColor: t.surface.crest,
    },
    textDisabled: {
      color: t.text.disabled,
    },
    text: {
      color: t.accent.onFill,
      fontFamily: fontFamilyNative.bold,
      fontSize: fontSize.bodyLg,
      letterSpacing: letterSpacing.normal,
      // `adjustsFontSizeToFit` stretches the Text to the full button width, so
      // without an explicit center the label left-aligns (visible on short labels
      // like the swap "Confirm (13)" countdown).
      textAlign: 'center',
    },
  });
