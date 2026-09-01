/**
 * PortfolioSubTabs — the in-page Portfolio | NFTs segmented row.
 *
 * Left: text tabs, active carries an accent underline that slides from the
 * previous tab to the new one — translateX and width driven by each tab's
 * measured `onLayout`, so any number of tabs (a future powerup tab) just
 * works with no hardcoded width. The label itself crossfades weight and
 * color between inactive (secondary, semibold) and active (primary, bold)
 * over the same `drift` beat — reduced motion collapses both to a snap via
 * `resolveMotionMs`, no special-casing needed at the call site.
 *
 * Right: a 36x36 outline circle button for the (stubbed, CORE 16) portfolio
 * visibility sheet.
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
import { useTranslation } from 'react-i18next';
import { borderRadius, fontFamilyNative, fontSize, motionMs, s, semantic, spacing, vs } from '@salmon/shared';
import { SlidersIcon } from '../../icons';
import { IconBubble } from '../IconBubble';
import { timing } from '../../utils/motion';
import type { PortfolioSubTabsProps } from './types';

const VISIBILITY_BUTTON_SIZE = 36;
const VISIBILITY_GLYPH_SIZE = 18;
const UNDERLINE_WIDTH = 48;
const UNDERLINE_HEIGHT = 2;

const AnimatedText = Animated.createAnimatedComponent(Text);

type TabLayout = { x: number; width: number };

interface SubTabProps {
  tabKey: string;
  label: string;
  isActive: boolean;
  isReduceMotionEnabled: boolean;
  onLayoutMeasured: (key: string, layout: TabLayout) => void;
  onPress: () => void;
}

/**
 * One tab's label. Owns its own weight/color crossfade — kept per-tab so
 * each label's progress lives in its own shared value rather than a single
 * hook shared awkwardly across an array.
 */
const SubTab: React.FC<SubTabProps> = ({
  tabKey,
  label,
  isActive,
  isReduceMotionEnabled,
  onLayoutMeasured,
  onPress,
}) => {
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, timing(motionMs.drift, isReduceMotionEnabled));
  }, [isActive, isReduceMotionEnabled, progress]);

  const animatedTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [semantic.text.secondary, semantic.text.primary]
    ),
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
      testID={`portfolio-tab-${tabKey}`}
      style={styles.tab}
      onPress={onPress}
      onLayout={handleLayout}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <AnimatedText style={[styles.tabText, animatedTextStyle]}>{label}</AnimatedText>
    </TouchableOpacity>
  );
};

export const PortfolioSubTabs: React.FC<PortfolioSubTabsProps> = ({
  tabs,
  activeKey,
  onChange,
  onVisibilityPress,
  style,
  testID,
}) => {
  const { t } = useTranslation();
  const isReduceMotionEnabled = useReducedMotion();

  const [layouts, setLayouts] = useState<Record<string, TabLayout>>({});
  const hasMeasuredActive = useRef(false);
  const underlineX = useSharedValue(0);
  const underlineWidth = useSharedValue(UNDERLINE_WIDTH);

  const handleLayoutMeasured = useCallback((key: string, layout: TabLayout) => {
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
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.tabs}>
        {tabs.map(({ key, label }) => (
          <SubTab
            key={key}
            tabKey={key}
            label={label}
            isActive={key === activeKey}
            isReduceMotionEnabled={isReduceMotionEnabled}
            onLayoutMeasured={handleLayoutMeasured}
            onPress={() => handlePress(key)}
          />
        ))}
        <Animated.View
          testID="portfolio-tabs-underline"
          style={[styles.underline, underlineStyle]}
        />
      </View>

      <IconBubble
        testID="portfolio-visibility-button"
        size={VISIBILITY_BUTTON_SIZE}
        tone="outline"
        icon={SlidersIcon}
        iconSize={VISIBILITY_GLYPH_SIZE}
        // `.pen`: this glyph is secondary ink while the Receive circle beside
        // it — the same `outline` tone — carries primary. The button is an
        // adjustment, not an action.
        iconColor={semantic.text.secondary}
        onPress={onVisibilityPress}
        accessibilityLabel={t(
          'accessibility.portfolio_visibility',
          'Portfolio visibility settings'
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(spacing.xl),
    position: 'relative',
    paddingBottom: vs(spacing.xxs) + vs(UNDERLINE_HEIGHT),
  },
  tab: {
    alignItems: 'center',
  },
  tabText: {
    fontSize: s(fontSize.bodyLg),
    lineHeight: s(fontSize.bodyLg) * 1.3,
  },
  underline: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: vs(UNDERLINE_HEIGHT),
    borderRadius: borderRadius.r1,
    backgroundColor: semantic.accent.fill,
  },
});

export default PortfolioSubTabs;
