import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {
  colors,
  componentSizes,
  fontFamilyNative,
  fontScaleCap,
  ms,
  s,
  spacing,
  vs,
  borderWidth,
  gradients,
  semantic,
} from '@salmon/shared';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Thermocline } from '../Thermocline';
import { GridViewSvgIcon, HomeSvgIcon, SwapSvgIcon } from '../Icon';
import { useTabChrome } from '../../../hooks/useTabChrome';
import { useTaskChrome } from '../../contexts/TaskChromeContext';
import { curve, timing } from '../../utils/motion';
import { FLOAT_IN_MS, SINK_FLOAT_TRAVEL, SINK_OUT_MS } from '../../utils/sinkAndFloat';
import type { TabConfig } from './types';

const TAB_CONFIG: Record<string, TabConfig> = {
  index: {
    name: 'index',
    icon: HomeSvgIcon,
    label: 'Home',
    labelKey: 'tabs.home',
    iconSize: s(26),
  },
  collectibles: {
    name: 'collectibles',
    icon: GridViewSvgIcon,
    label: 'Collectibles',
    labelKey: 'tabs.collectibles',
    iconSize: s(26),
  },
  swap: {
    name: 'swap',
    icon: SwapSvgIcon,
    label: 'Swap',
    labelKey: 'tabs.swap',
    iconSize: s(26),
  },
};

// Order of tabs as they should appear
const TAB_ORDER = ['index', 'collectibles', 'swap'];

interface TabItemProps {
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function TabItem({ routeName, isFocused, onPress, onLongPress }: TabItemProps) {
  const { t } = useTranslation();
  const config = TAB_CONFIG[routeName];

  if (!config) {
    return null;
  }

  // The one-fill rule governs fills, not ink, so which tab you are on can be
  // salmon again: `accent.ink` at 6.07:1 on the bar, against `text.tertiary`
  // for the rest. The Send pill keeps the screen's only salmon fill.
  const iconColor = isFocused ? semantic.accent.ink : semantic.text.tertiary;
  const labelColor = isFocused ? semantic.accent.ink : semantic.text.tertiary;
  const IconComponent = config.icon;

  return (
    <TouchableOpacity
      testID={`tab-${routeName === 'index' ? 'home' : routeName}`}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={t(config.labelKey, config.label)}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.tabItem, isFocused ? styles.tabItemFocused : undefined]}
    >
      <View style={styles.tabIconContainer}>
        <IconComponent size={config.iconSize} color={iconColor} />
      </View>
      <Text
        style={[
          styles.tabLabel,
          isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
          { color: labelColor },
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
        maxFontSizeMultiplier={fontScaleCap.chrome}
      >
        {t(config.labelKey, config.label)}
      </Text>
    </TouchableOpacity>
  );
}

export function GlassTabBar({ state, descriptors: _descriptors, navigation }: BottomTabBarProps) {
  const { tabBarBottomPadding } = useTabChrome();

  // The pill is the shell's footer, and the verb owns it too (owner,
  // on-device 2026-08-18): when the swap's task window takes the screen the
  // whole bar sinks with the outgoing content — the normal sink, distance and
  // duration from the shared verb — and floats back as the shell returns.
  // Reduce motion: `timing` resolves to a cut.
  const { isTaskEngaged } = useTaskChrome();
  const isReduceMotionEnabled = useReducedMotion();
  const sunk = useSharedValue(isTaskEngaged ? 1 : 0);
  useEffect(() => {
    sunk.value = withTiming(
      isTaskEngaged ? 1 : 0,
      isTaskEngaged
        ? timing(SINK_OUT_MS, isReduceMotionEnabled, curve.sink)
        : timing(FLOAT_IN_MS, isReduceMotionEnabled)
    );
  }, [isTaskEngaged, isReduceMotionEnabled, sunk]);
  const sinkStyle = useAnimatedStyle(() => ({
    opacity: 1 - sunk.value,
    transform: [{ translateY: sunk.value * SINK_FLOAT_TRAVEL }],
  }));

  // Filter and order routes to only show Home, Collectibles, and Swap
  const visibleRoutes = TAB_ORDER.map((tabName) =>
    state.routes.find((route) => route.name === tabName)
  ).filter((route): route is (typeof state.routes)[0] => route !== undefined);

  return (
    <Animated.View
      style={[styles.container, sinkStyle]}
      pointerEvents={isTaskEngaged ? 'none' : 'auto'}
    >
      {/*
        Membrane bottom edge — conceptually the lower boundary of the future
        membrane material; the membrane batch should absorb this gradient.
        It runs to the physical bottom edge (safe area included) so no raw
        list row shows in the gap under the pill, and its opaque stop is the
        water's own floor so it reads as depth, not a slab.
      */}
      <LinearGradient
        colors={gradients.tabBarFade.colors}
        locations={[...gradients.tabBarFade.locations]}
        start={gradients.tabBarFade.start}
        end={gradients.tabBarFade.end}
        style={styles.membraneBottomEdge}
        pointerEvents="none"
        testID="tab-bar-fade"
      />
      <View style={[styles.content, { paddingBottom: tabBarBottomPadding }]}>
        <View style={styles.glassContainer}>
          {/*
            The tab bar is the app's canonical thermocline: chrome that floats
            over scrolling content, at the 12px control radius. Tier is
            `thick` rather than the `thin` a tab bar would normally wear
            because the tab labels are 11px — below the ≥15px / weight-500
            floor `membraneThin` guarantees. The tabBarFade gradient below is
            the material's own bottom edge and stays as it is.
          */}
          <Thermocline
            surface="chrome"
            tier="thick"
            style={styles.glassBackgroundLayer}
            borderColor={colors.border.subtle}
            borderWidth={borderWidth.thin}
          />
          <View style={styles.bar}>
            {visibleRoutes.map((route) => {
              const isFocused = state.routes[state.index]?.name === route.name;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              const onLongPress = () => {
                navigation.emit({
                  type: 'tabLongPress',
                  target: route.key,
                });
              };

              return (
                <TabItem
                  key={route.key}
                  routeName={route.name}
                  isFocused={isFocused}
                  onPress={onPress}
                  onLongPress={onLongPress}
                />
              );
            })}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
    elevation: 50,
  },
  // Spans the whole container, safe-area gap included — the water-colored
  // stops are what keep the old opaque-black slab from coming back.
  membraneBottomEdge: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    width: '100%',
    paddingHorizontal: s(spacing.lg),
    paddingTop: vs(spacing.lg),
  },
  glassContainer: {
    width: '100%',
    borderRadius: componentSizes.tabBarRadius,
    overflow: 'hidden',
    position: 'relative',
  },
  glassBackgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: componentSizes.tabBarRadius,
    backgroundColor: colors.background.glass,
    borderColor: colors.border.subtle,
    borderWidth: borderWidth.thin,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    minHeight: vs(componentSizes.tabBarItemHeight + 8),
    paddingHorizontal: s(spacing.md),
    paddingVertical: vs(spacing.xs),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: vs(componentSizes.tabBarItemHeight),
    paddingHorizontal: s(spacing.sm),
    paddingVertical: vs(spacing.xs),
    gap: s(2),
  },
  tabItemFocused: {
    opacity: 1,
  },
  tabIconContainer: {
    height: vs(componentSizes.iconSizeMButton),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily: fontFamilyNative.semiBold,
    fontSize: ms(11),
    lineHeight: ms(13),
    letterSpacing: ms(0.2, 0.3),
    textAlign: 'center',
  },
  tabLabelActive: {
    color: semantic.text.primary,
  },
  tabLabelInactive: {
    color: semantic.text.tertiary,
  },
});

export default GlassTabBar;
