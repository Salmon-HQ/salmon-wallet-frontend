/**
 * PortfolioSubTabs — the in-page Portfolio | NFTs segmented row.
 *
 * Left: `UnderlineTabs` at `md`, which owns the whole selection idiom — the
 * measured sliding accent underline and the label's weight/color crossfade
 * over the `drift` beat, reduce-motion collapse included. The Activity
 * filters use the same component at `sm`; there is one selection language
 * for lateral choices, not two (DESIGN.md §Navigation).
 *
 * Right: a 36x36 outline circle button that opens the sheet where the tabs are
 * arranged. It sits OUTSIDE the tab row, pinned to the right edge, so it holds
 * still when the row itself becomes a carousel on a narrow phone.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { s, spacing } from '@salmon/shared';
import { useTranslation } from 'react-i18next';

import { useSemantic } from '../../theme/useThemedStyles';
import { SlidersIcon } from '../../icons';
import { IconBubble } from '../IconBubble';
import { UnderlineTabs } from '../UnderlineTabs';
import type { PortfolioSubTabsProps } from './types';

const ORDER_BUTTON_SIZE = 36;
const ORDER_GLYPH_SIZE = 18;

export const PortfolioSubTabs: React.FC<PortfolioSubTabsProps> = ({
  tabs,
  activeKey,
  onChange,
  onOrderPress,
  tabsKey,
  tabsEntering,
  tabsExiting,
  style,
  testID,
}) => {
  const { t } = useTranslation();
  const { text } = useSemantic();

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* The region takes the width the button leaves it — that constraint
          is what lets `UnderlineTabs` know whether its labels fit. Only the
          tabs play the reorder verb; the button at the right holds still —
          it is the control, not the content it rearranges. */}
      <Reanimated.View
        key={tabsKey}
        testID="portfolio-tabs-region"
        style={styles.tabsRegion}
        entering={tabsEntering}
        exiting={tabsExiting}
      >
        <UnderlineTabs
          tabs={tabs}
          activeKey={activeKey}
          onChange={onChange}
          size="md"
          tabTestIDPrefix="portfolio-tab"
          underlineTestID="portfolio-tabs-underline"
        />
      </Reanimated.View>

      <IconBubble
        testID="portfolio-order-button"
        size={ORDER_BUTTON_SIZE}
        tone="outline"
        icon={SlidersIcon}
        iconSize={ORDER_GLYPH_SIZE}
        // `.pen`: this glyph is secondary ink while the Receive circle beside
        // it — the same `outline` tone — carries primary. The button is an
        // adjustment, not an action.
        iconColor={text.secondary}
        onPress={onOrderPress}
        accessibilityLabel={t('accessibility.portfolio_order', 'Arrange tabs')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Row anatomy, not a component seam: the tabs keep clear of the button
    // rather than running into it once the row is scrollable.
    gap: s(spacing.md),
  },
  tabsRegion: {
    flex: 1,
  },
});

export default PortfolioSubTabs;
