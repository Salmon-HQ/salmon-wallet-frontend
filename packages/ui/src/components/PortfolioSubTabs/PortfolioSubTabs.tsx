/**
 * PortfolioSubTabs — the in-page Portfolio | NFTs segmented row, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/PortfolioSubTabs/PortfolioSubTabs.tsx`:
 * a `UnderlineTabs` (the shared selection idiom, DESIGN.md §Navigation) beside
 * an outline `IconBubble` order button that opens the sheet where the tabs
 * are arranged. The button sits OUTSIDE the tab row, pinned to the right
 * edge, so it holds still when the row itself becomes a scroller.
 *
 * A change in the set of tabs — one installed, one removed, a reorder —
 * moves only the tabs concerned: `UnderlineTabs`' own job, on both twins.
 * The region here is one persistent element and the button never moves.
 */
import { spacing, componentSizes } from '@salmon/shared';
import { useTranslation } from 'react-i18next';

import { useSemantic } from '../../theme/ThemeProvider';
import { SlidersIcon } from '../../icons';
import { IconBubble } from '../IconBubble';
import { UnderlineTabs } from '../UnderlineTabs';
import type { PortfolioSubTabsProps } from './types';

const ORDER_BUTTON_SIZE = componentSizes.iconBubbleSm;
const ORDER_GLYPH_SIZE = componentSizes.iconSizeXSmall;

export function PortfolioSubTabs({
  tabs,
  activeKey,
  onChange,
  onOrderPress,
  settled,
  style,
  className,
  testID,
}: PortfolioSubTabsProps) {
  const { t } = useTranslation();
  const { text } = useSemantic();
  return (
    <div
      data-testid={testID}
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        ...style,
      }}
    >
      <div data-testid="portfolio-tabs-region" style={{ flex: 1, minWidth: 0 }}>
        <UnderlineTabs
          tabs={tabs}
          activeKey={activeKey}
          onChange={onChange}
          settled={settled}
          size="md"
          tabTestIDPrefix="portfolio-tab"
          underlineTestID="portfolio-tabs-underline"
        />
      </div>

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
    </div>
  );
}
