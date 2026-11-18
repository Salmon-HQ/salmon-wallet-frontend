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
import { borderWidth, componentSizes, iconBubbleLook, fontFamilyNative, s } from '@salmon/shared';

import { useSemantic } from '../../theme/useThemedStyles';
import { usePressMotion } from '../../../hooks/usePressMotion';
import { FleshBackground } from '../FleshBackground';
import { PressSpecular } from '../PressSpecular';
import type { IconBubbleProps } from './types';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

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
    ink,
    border,
    cornerRadius,
    glyph: glyphSize,
  } = iconBubbleLook(t, {
    tone,
    shape,
    radius,
    size,
    iconSize,
    iconColor,
    disabled: isDisabled,
  });
  const box = s(size);
  const glyph = s(glyphSize);

  const shell = [
    styles.bubble,
    {
      width: box,
      height: box,
      backgroundColor: background,
      borderRadius: cornerRadius,
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
