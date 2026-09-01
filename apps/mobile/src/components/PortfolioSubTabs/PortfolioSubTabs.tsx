/**
 * PortfolioSubTabs — the in-page Portfolio | NFTs segmented row.
 *
 * Left: `UnderlineTabs` at `md`, which owns the whole selection idiom — the
 * measured sliding accent underline and the label's weight/color crossfade
 * over the `drift` beat, reduce-motion collapse included. The Activity
 * filters use the same component at `sm`; there is one selection language
 * for lateral choices, not two (DESIGN.md §Navigation).
 *
 * Right: a 36x36 outline circle button for the (stubbed, CORE 16) portfolio
 * visibility sheet.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useSemantic } from '../../theme/useThemedStyles';
import { SlidersIcon } from '../../icons';
import { IconBubble } from '../IconBubble';
import { UnderlineTabs } from '../UnderlineTabs';
import type { PortfolioSubTabsProps } from './types';

const VISIBILITY_BUTTON_SIZE = 36;
const VISIBILITY_GLYPH_SIZE = 18;

export const PortfolioSubTabs: React.FC<PortfolioSubTabsProps> = ({
  tabs,
  activeKey,
  onChange,
  onVisibilityPress,
  style,
  testID,
}) => {
  const { t } = useTranslation();
  const { text } = useSemantic();

  return (
    <View style={[styles.container, style]} testID={testID}>
      <UnderlineTabs
        tabs={tabs}
        activeKey={activeKey}
        onChange={onChange}
        size="md"
        tabTestIDPrefix="portfolio-tab"
        underlineTestID="portfolio-tabs-underline"
      />

      <IconBubble
        testID="portfolio-visibility-button"
        size={VISIBILITY_BUTTON_SIZE}
        tone="outline"
        icon={SlidersIcon}
        iconSize={VISIBILITY_GLYPH_SIZE}
        // `.pen`: this glyph is secondary ink while the Receive circle beside
        // it — the same `outline` tone — carries primary. The button is an
        // adjustment, not an action.
        iconColor={text.secondary}
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
});

export default PortfolioSubTabs;
