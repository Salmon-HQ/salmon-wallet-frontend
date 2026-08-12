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
} from '@salmon/shared';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BlurContainer } from '../BlurContainer';
import { GridViewSvgIcon, HomeSvgIcon, SwapSvgIcon } from '../Icon';
import { useTabChrome } from '../../../hooks/useTabChrome';
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

  const iconColor = isFocused ? colors.tabBar.active : colors.tabBar.inactive;
  const labelColor = isFocused ? colors.tabBar.active : colors.tabBar.inactive;
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

  // Filter and order routes to only show Home, Collectibles, and Swap
  const visibleRoutes = TAB_ORDER.map((tabName) =>
    state.routes.find((route) => route.name === tabName)
  ).filter((route): route is (typeof state.routes)[0] => route !== undefined);

  return (
    <LinearGradient
      colors={gradients.tabBarFade.colors}
      start={gradients.tabBarFade.start}
      end={gradients.tabBarFade.end}
      style={[
        styles.container,
        {
          paddingBottom: tabBarBottomPadding,
        },
      ]}
    >
      <View style={styles.glassContainer}>
        <BlurContainer
          style={styles.glassBackgroundLayer}
          blurIntensity={24}
          backgroundColor={colors.background.glass}
          borderColor={colors.border.subtle}
          borderWidth={borderWidth.thin}
          useGradientBorder
          pointerEvents="none"
        >
          <></>
        </BlurContainer>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: s(spacing.lg),
    paddingTop: vs(spacing.lg),
    zIndex: 50,
    elevation: 50,
  },
  glassContainer: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  glassBackgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
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
    color: colors.tabBar.active,
  },
  tabLabelInactive: {
    color: colors.tabBar.inactive,
  },
});

export default GlassTabBar;
