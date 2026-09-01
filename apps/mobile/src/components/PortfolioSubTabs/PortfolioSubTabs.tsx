/**
 * PortfolioSubTabs — the in-page Portfolio | NFTs segmented row.
 *
 * Left: text tabs, active carries a 48x2 accent underline. Right: a 36x36
 * outline circle button for the (stubbed, CORE 16) portfolio visibility
 * sheet.
 */
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { borderRadius, fontFamilyNative, fontSize, s, semantic, spacing, vs } from '@salmon/shared';
import { SlidersIcon } from '../../icons';
import { IconBubble } from '../IconBubble';
import type { PortfolioSubTabsProps } from './types';

const VISIBILITY_BUTTON_SIZE = 36;
const VISIBILITY_GLYPH_SIZE = 18;
const UNDERLINE_WIDTH = 48;
const UNDERLINE_HEIGHT = 2;

export const PortfolioSubTabs: React.FC<PortfolioSubTabsProps> = ({
  tabs,
  activeKey,
  onChange,
  onVisibilityPress,
  style,
  testID,
}) => {
  const { t } = useTranslation();

  const handlePress = useCallback(
    (key: string) => {
      if (key !== activeKey) {
        onChange(key);
      }
    },
    [activeKey, onChange]
  );

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.tabs}>
        {tabs.map(({ key, label }) => {
          const isActive = key === activeKey;
          return (
            <TouchableOpacity
              key={key}
              testID={`portfolio-tab-${key}`}
              style={styles.tab}
              onPress={() => handlePress(key)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive]}
              >
                {label}
              </Text>
              {isActive && <View style={styles.underline} />}
            </TouchableOpacity>
          );
        })}
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
  },
  tab: {
    alignItems: 'center',
  },
  tabText: {
    fontSize: s(fontSize.bodyLg),
    lineHeight: s(fontSize.bodyLg) * 1.3,
  },
  tabTextActive: {
    fontFamily: fontFamilyNative.bold,
    color: semantic.text.primary,
  },
  tabTextInactive: {
    fontFamily: fontFamilyNative.semiBold,
    color: semantic.text.secondary,
  },
  underline: {
    marginTop: vs(spacing.xxs),
    width: s(UNDERLINE_WIDTH),
    height: vs(UNDERLINE_HEIGHT),
    borderRadius: borderRadius.r1,
    backgroundColor: semantic.accent.fill,
  },
});

export default PortfolioSubTabs;
