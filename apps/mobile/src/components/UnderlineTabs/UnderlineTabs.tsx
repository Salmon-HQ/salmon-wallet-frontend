/**
 * UnderlineTabs — the product's one selection language for lateral choices.
 *
 * A horizontal set of mutually exclusive options: the selected one carries an
 * accent underline that slides from the previous option to the new one —
 * translateX and width driven by each tab's measured `onLayout`, so any number
 * of tabs just works with no hardcoded width. The label itself crossfades
 * weight and color between inactive (secondary, semibold) and active (primary,
 * bold) over the same `drift` beat — reduced motion collapses both to a snap
 * via `resolveMotionMs`, no special-casing needed at the call site.
 *
 * Two sizes, one behaviour: `md` for in-page sub-tabs (16pt labels), `sm` for
 * a filter row (11/700 uppercase). Nothing here fills or boxes the selected
 * option — see DESIGN.md §Navigation.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  borderRadius,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  letterSpacing,
  lineHeight,
  motionMs,
  s,
  spacing,
  vs,
  type Semantic,
} from '@salmon/shared';

import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { timing } from '../../utils/motion';
import type { UnderlineTabsProps, UnderlineTabsSize } from './types';

const UNDERLINE_WIDTH = 48;
const UNDERLINE_HEIGHT = 2;

type SizeMetrics = {
  font: number;
  gap: number;
  uppercase: boolean;
  letterSpacing: number;
};

const SIZES: Record<UnderlineTabsSize, SizeMetrics> = {
  md: {
    font: fontSize.bodyLg,
    gap: spacing.xl,
    uppercase: false,
    letterSpacing: 0,
  },
  sm: {
    font: fontSize.caption,
    gap: spacing.md,
    uppercase: true,
    letterSpacing: letterSpacing.label,
  },
};

const AnimatedText = Animated.createAnimatedComponent(Text);

type TabLayoutMeasure = { x: number; width: number };

interface UnderlineTabProps {
  tabKey: string;
  label: string;
  isActive: boolean;
  isReduceMotionEnabled: boolean;
  metrics: SizeMetrics;
  testID?: string;
  onLayoutMeasured: (key: string, layout: TabLayoutMeasure) => void;
  onPress: () => void;
}

/**
 * One tab's label. Owns its own weight/color crossfade — kept per-tab so
 * each label's progress lives in its own shared value rather than a single
 * hook shared awkwardly across an array.
 */
const UnderlineTab: React.FC<UnderlineTabProps> = ({
  tabKey,
  label,
  isActive,
  isReduceMotionEnabled,
  metrics,
  testID,
  onLayoutMeasured,
  onPress,
}) => {
  const styles = useThemedStyles(stylesFor);
  const { text } = useSemantic();
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, timing(motionMs.drift, isReduceMotionEnabled));
  }, [isActive, isReduceMotionEnabled, progress]);

  const animatedTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [text.secondary, text.primary]),
    // fontFamily cannot interpolate — the weight switches at the crossfade's
    // midpoint, timed alongside the color it lands with.
    fontFamily: progress.value > 0.5 ? fontFamilyNative.bold : fontFamilyNative.semiBold,
  }));

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      onLayoutMeasured(tabKey, { x, width });
    },
    [tabKey, onLayoutMeasured]
  );

  return (
    <TouchableOpacity
      testID={testID}
      style={styles.tab}
      onPress={onPress}
      onLayout={handleLayout}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <AnimatedText
        style={[
          {
            fontSize: s(metrics.font),
            lineHeight: s(metrics.font) * lineHeight.snug,
            letterSpacing: metrics.letterSpacing,
          },
          metrics.uppercase && styles.uppercase,
          animatedTextStyle,
        ]}
        numberOfLines={1}
        maxFontSizeMultiplier={fontScaleCap.chrome}
      >
        {label}
      </AnimatedText>
    </TouchableOpacity>
  );
};

export const UnderlineTabs: React.FC<UnderlineTabsProps> = ({
  tabs,
  activeKey,
  onChange,
  size = 'md',
  tabTestIDPrefix,
  underlineTestID,
  style,
  testID,
}) => {
  const styles = useThemedStyles(stylesFor);
  const isReduceMotionEnabled = useReducedMotion();
  const metrics = SIZES[size];

  const [layouts, setLayouts] = useState<Record<string, TabLayoutMeasure>>({});
  const hasMeasuredActive = useRef(false);
  const underlineX = useSharedValue(0);
  const underlineWidth = useSharedValue(UNDERLINE_WIDTH);

  const handleLayoutMeasured = useCallback((key: string, layout: TabLayoutMeasure) => {
    setLayouts((prev) => {
      const existing = prev[key];
      if (existing && existing.x === layout.x && existing.width === layout.width) {
        return prev;
      }
      return { ...prev, [key]: layout };
    });
  }, []);

  useEffect(() => {
    const activeLayout = layouts[activeKey];
    if (!activeLayout) return;

    if (!hasMeasuredActive.current) {
      // First measurement: land on it directly, no travel from a stale 0.
      underlineX.value = activeLayout.x;
      underlineWidth.value = activeLayout.width;
      hasMeasuredActive.current = true;
      return;
    }

    const config = timing(motionMs.drift, isReduceMotionEnabled);
    underlineX.value = withTiming(activeLayout.x, config);
    underlineWidth.value = withTiming(activeLayout.width, config);
  }, [activeKey, layouts, isReduceMotionEnabled, underlineX, underlineWidth]);

  const handlePress = useCallback(
    (key: string) => {
      if (key !== activeKey) {
        onChange(key);
      }
    },
    [activeKey, onChange]
  );

  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: underlineX.value }],
    width: underlineWidth.value,
  }));

  return (
    <View style={[styles.tabs, { gap: s(metrics.gap) }, style]} testID={testID}>
      {tabs.map(({ key, label }) => (
        <UnderlineTab
          key={key}
          tabKey={key}
          label={label}
          isActive={key === activeKey}
          isReduceMotionEnabled={isReduceMotionEnabled}
          metrics={metrics}
          testID={tabTestIDPrefix ? `${tabTestIDPrefix}-${key}` : undefined}
          onLayoutMeasured={handleLayoutMeasured}
          onPress={() => handlePress(key)}
        />
      ))}
      <Animated.View testID={underlineTestID} style={[styles.underline, underlineStyle]} />
    </View>
  );
};

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    tabs: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      position: 'relative',
      paddingBottom: vs(spacing.xxs) + vs(UNDERLINE_HEIGHT),
    },
    tab: {
      alignItems: 'center',
    },
    uppercase: {
      textTransform: 'uppercase',
    },
    underline: {
      position: 'absolute',
      left: 0,
      bottom: 0,
      height: vs(UNDERLINE_HEIGHT),
      borderRadius: borderRadius.r1,
      backgroundColor: t.accent.fill,
    },
  });

export default UnderlineTabs;
