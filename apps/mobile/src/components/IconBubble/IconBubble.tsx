/**
 * IconBubble — the round or rounded well every glyph, initial and avatar in
 * the redesign sits in.
 *
 * One component instead of the dozen ad-hoc `width/height/borderRadius`
 * triples the screens used to carry: a token icon, an activity icon, the back
 * affordance, a success seal and a powerup thumb are the same object at
 * different sizes and tones.
 *
 * Hand it an `onPress` and the same object becomes a control — Send, Receive,
 * the wallet thumb, the settings avatar and the powerups FAB are this
 * component with different props, not five hand-drawn circles. The pressed
 * behaviour is the repo's one press idiom (`usePressMotion` + `PressSpecular`,
 * plus the flesh inside a salmon fill), so a circular button cannot drift from
 * a pill-shaped one.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import {
  borderRadius,
  borderWidth,
  componentSizes,
  fontFamilyNative,
  s,
  type Semantic,
} from '@salmon/shared';

import { useSemantic } from '../../theme/useThemedStyles';
import { usePressMotion } from '../../../hooks/usePressMotion';
import { FleshBackground } from '../FleshBackground';
import { PressSpecular } from '../PressSpecular';
import type { IconBubbleProps, IconBubbleRadius, IconBubbleTone } from './types';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/** Ground + ink per tone. The ink is not a choice the call site gets to make. */
const tonesFor = (
  t: Semantic
): Record<IconBubbleTone, { background: string; ink: string; border?: string }> => ({
  ink: { background: t.depth.abyss, ink: t.text.primary },
  accent: { background: t.accent.fill, ink: t.accent.onFill },
  'accent-tint': { background: t.accent.tint, ink: t.accent.ink },
  surface: { background: t.surface.raised, ink: t.text.primary },
  'success-tint': { background: t.status.successTint, ink: t.status.success },
  outline: {
    background: 'transparent',
    ink: t.text.primary,
    border: t.border.raised,
  },
  ghost: { background: 'transparent', ink: t.text.secondary },
});

/** A disabled control is a different object, not a dimmed one. */
const disabledFor = (t: Semantic) => ({ background: t.surface.crest, ink: t.text.disabled });

/** The two card corners a rounded bubble can take — `Card`'s own two steps. */
const RADII: Record<IconBubbleRadius, number> = {
  lg: borderRadius.r3,
  xl: borderRadius.r4,
};

/** The drawn glyph-to-bubble ratio, from the design frames. */
const ICON_RATIO = 0.45;

export function IconBubble({
  size,
  shape = 'circle',
  radius = 'xl',
  tone,
  icon: Glyph,
  iconSize,
  iconWeight,
  iconColor,
  children,
  onPress,
  disabled = false,
  flesh,
  hitSlop,
  rotation,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: IconBubbleProps) {
  const t = useSemantic();
  const { scale: pressScale, pressHandlers, specular } = usePressMotion();

  // One `transform`, built once. The press scale and a caller-supplied
  // rotation used to arrive as two separate styles, and a style array does not
  // merge `transform` arrays — the last one won and the rotation never played.
  const motionStyle = useAnimatedStyle(() => ({
    transform: rotation
      ? [{ rotate: `${rotation.value}deg` }, { scale: pressScale.value }]
      : [{ scale: pressScale.value }],
  }));

  const isDisabled = !!onPress && disabled;
  const {
    background,
    ink: toneInk,
    border,
  } = isDisabled ? { ...disabledFor(t), border: undefined } : tonesFor(t)[tone];
  // A disabled control is one object: its ink is not the call site's to pick.
  const ink = isDisabled ? toneInk : (iconColor ?? toneInk);
  const box = s(size);
  const glyph = s(iconSize ?? Math.round(size * ICON_RATIO));

  const shell = [
    styles.bubble,
    {
      width: box,
      height: box,
      backgroundColor: background,
      borderRadius: shape === 'circle' ? borderRadius.full : RADII[radius],
    },
    border != null && { borderWidth: borderWidth.actionButton, borderColor: border },
    style,
  ];

  const body = (
    <>
      {Glyph ? <Glyph size={glyph} color={ink} weight={iconWeight} /> : null}
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text style={[styles.initial, { color: ink, fontSize: glyph }]} numberOfLines={1}>
          {children}
        </Text>
      ) : (
        children
      )}
    </>
  );

  // A salmon fill is mass, so it carries the flesh; every other ground is
  // surface and carries none. The call site can still say otherwise. This
  // applies whether or not the bubble is pressable — an inert accent well is
  // still a solid accent fill.
  const showFlesh = (flesh ?? tone === 'accent') && !isDisabled;

  if (!onPress) {
    return (
      <View testID={testID} accessibilityLabel={accessibilityLabel} style={shell}>
        {showFlesh && <FleshBackground scale={componentSizes.bubbleFleshScale} />}
        {body}
      </View>
    );
  }

  return (
    <AnimatedTouchable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={hitSlop}
      activeOpacity={0.8}
      {...pressHandlers}
      style={[...shell, motionStyle]}
    >
      {showFlesh && <FleshBackground scale={componentSizes.bubbleFleshScale} />}
      {body}
      {!isDisabled && <PressSpecular {...specular} />}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    // The flesh and the specular are drawn at absolute-fill; the clip is what
    // keeps them inside the bubble's own radius.
    overflow: 'hidden',
  },
  initial: {
    fontFamily: fontFamilyNative.bold,
    textAlign: 'center',
  },
});
