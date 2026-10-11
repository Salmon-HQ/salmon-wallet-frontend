/**
 * Card — the one content container the redesign composes everything from.
 *
 * A list item, a receipt, a chart box, a QR well and a permissions block are
 * the same object with a different tone and padding, so they are one
 * component: nothing else in `apps/mobile` should be re-deriving a background,
 * a radius and a hairline by hand.
 */
import React, { useId, useState } from 'react';
import { type LayoutChangeEvent, View, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import {
  borderWidth,
  CARD_GLOW,
  CARD_PADDINGS,
  CARD_RADII,
  cardTonesFor,
  s,
  type Semantic,
} from '@salmon/shared';

import { useSemantic } from '../../theme/useThemedStyles';
import type { CardProps } from './types';

/**
 * The `featured` tone's salmon glow, under the card's content. Sized from the
 * card's measured box: a "100%" SVG on Android takes the content box and
 * stops a padding short of the edges.
 */
function Glow({
  testID,
  width,
  height,
  radius,
  t,
}: {
  testID?: string;
  width: number;
  height: number;
  radius: number;
  t: Semantic;
}) {
  const id = useId();
  return (
    <Svg
      testID={testID && `${testID}-glow`}
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient
          id={id}
          cx={`${CARD_GLOW.cx * 100}%`}
          cy={`${CARD_GLOW.cy * 100}%`}
          rx={`${CARD_GLOW.rx * 100}%`}
          ry={`${CARD_GLOW.ry * 100}%`}
        >
          <Stop offset="0" stopColor={t.accent.ink} stopOpacity={CARD_GLOW.alpha} />
          <Stop offset="1" stopColor={t.accent.ink} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={height} rx={radius} ry={radius} fill={`url(#${id})`} />
    </Svg>
  );
}

export function Card({
  tone = 'surface',
  padding = 'lg',
  gap,
  radius = 'xl',
  onPress,
  accessibilityRole = 'button',
  accessibilityLabel,
  style,
  children,
  testID,
}: CardProps) {
  // A record of strings, not a stylesheet: built at render through
  // `useSemantic` rather than cached by `useThemedStyles`, which is for
  // `StyleSheet.create` blocks only.
  const t = useSemantic();
  const { background, border } = cardTonesFor(t)[tone];
  // The glow fills the box inside the border, measured once laid out.
  const [inner, setInner] = useState<{ width: number; height: number } | null>(null);
  const featured = tone === 'featured';
  const onLayout = featured
    ? ({ nativeEvent: { layout } }: LayoutChangeEvent) =>
        setInner({
          width: layout.width - 2 * borderWidth.thin,
          height: layout.height - 2 * borderWidth.thin,
        })
    : undefined;
  const glow =
    featured && inner ? (
      <Glow
        testID={testID}
        width={inner.width}
        height={inner.height}
        radius={CARD_RADII[radius] - borderWidth.thin}
        t={t}
      />
    ) : null;
  const box = [
    styles.card,
    {
      backgroundColor: background,
      borderColor: border,
      borderRadius: CARD_RADII[radius],
      padding: s(CARD_PADDINGS[padding]),
    },
    gap != null && { gap: s(gap) },
    style,
  ];

  if (!onPress) {
    return (
      <View testID={testID} style={box} accessibilityLabel={accessibilityLabel} onLayout={onLayout}>
        {glow}
        {children}
      </View>
    );
  }

  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      activeOpacity={0.7}
      style={box}
      onLayout={onLayout}
    >
      {glow}
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: borderWidth.thin,
    overflow: 'hidden',
  },
});
