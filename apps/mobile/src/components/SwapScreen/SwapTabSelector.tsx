import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  colors,
  fontSize,
  letterSpacing,
  lineHeight,
  spacing,
  ms,
  s,
  fontFamilyNative,
} from '@salmon/shared';
import type { SwapTabSelectorProps, SwapTab } from './types';

/**
 * Tab selector for switching between Swap and Bridge
 */
export const SwapTabSelector: React.FC<SwapTabSelectorProps> = ({
  activeTab,
  onTabChange,
  style,
}) => {
  const { t } = useTranslation();
  const handleTabPress = (tab: SwapTab) => {
    if (tab !== activeTab) {
      onTabChange(tab);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        testID="swap-tab"
        style={styles.tab}
        onPress={() => handleTabPress('swap')}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'swap' ? styles.tabTextActive : styles.tabTextInactive,
          ]}
        >
          {t('swap.swap')}
        </Text>
        <View
          style={[
            styles.tabIndicator,
            activeTab === 'swap' ? styles.tabIndicatorActive : styles.tabIndicatorInactive,
          ]}
        />
      </TouchableOpacity>

      <TouchableOpacity
        testID="bridge-tab"
        style={styles.tab}
        onPress={() => handleTabPress('bridge')}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === 'bridge' ? styles.tabTextActive : styles.tabTextInactive,
          ]}
        >
          {t('bridge.bridge')}
        </Text>
        <View
          style={[
            styles.tabIndicator,
            activeTab === 'bridge' ? styles.tabIndicatorActive : styles.tabIndicatorInactive,
          ]}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(spacing.lg),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  tabText: {
    fontSize: ms(fontSize.lg),
    fontFamily: fontFamilyNative.bold,
    letterSpacing: letterSpacing.wide,
    lineHeight: ms(18 * lineHeight.condensed),
  },
  tabTextActive: {
    color: colors.text.primary,
  },
  tabTextInactive: {
    color: colors.text.disabled,
  },
  tabIndicator: {
    width: '100%',
    height: 1,
  },
  tabIndicatorActive: {
    backgroundColor: colors.text.primary,
  },
  tabIndicatorInactive: {
    backgroundColor: colors.border.default,
  },
});

export default SwapTabSelector;
