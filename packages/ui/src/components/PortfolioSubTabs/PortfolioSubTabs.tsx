/**
 * PortfolioSubTabs — the in-page Portfolio | NFTs segmented row, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/PortfolioSubTabs/PortfolioSubTabs.tsx`:
 * a `UnderlineTabs` (the shared selection idiom, DESIGN.md §Navigation) beside
 * an outline `IconBubble` order button that opens the sheet where the tabs
 * are arranged. The button sits OUTSIDE the tab row, pinned to the right
 * edge, so it holds still when the row itself becomes a scroller.
 *
 * Mobile plays `tabsEntering`/`tabsExiting` — the sink/float verb — on the
 * tabs region alone, remounted on `tabsKey`, when a reorder changes it. Here
 * the same region is one persistent element: on a `tabsKey` change it plays
 * `sinkExiting`, swaps to the reordered tabs once that finishes (or
 * immediately under reduce motion / no WAAPI), then plays `floatEntering`.
 * A plain tab switch (same `tabsKey`) never triggers the verb — the
 * underline just slides, `UnderlineTabs`' own job.
 */
import { useEffect, useRef, useState } from 'react';
import { spacing, componentSizes } from '@salmon/shared';
import { useTranslation } from 'react-i18next';

import { useSemantic } from '../../theme/ThemeProvider';
import { useReducedMotion, floatEntering, sinkExiting } from '../../motion';
import { SlidersIcon } from '../../icons';
import { IconBubble } from '../IconBubble';
import { UnderlineTabs } from '../UnderlineTabs';
import type { PortfolioSubTab, PortfolioSubTabsProps } from './types';

const ORDER_BUTTON_SIZE = componentSizes.iconBubbleSm;
const ORDER_GLYPH_SIZE = componentSizes.iconSizeXSmall;

export function PortfolioSubTabs({
  tabs,
  activeKey,
  onChange,
  onOrderPress,
  tabsKey,
  style,
  className,
  testID,
}: PortfolioSubTabsProps) {
  const { t } = useTranslation();
  const { text } = useSemantic();
  const reducedMotion = useReducedMotion();

  const regionRef = useRef<HTMLDivElement>(null);
  const prevTabsKeyRef = useRef(tabsKey);
  const [displayed, setDisplayed] = useState<{ tabs: PortfolioSubTab[]; activeKey: string }>({
    tabs,
    activeKey,
  });

  useEffect(() => {
    if (tabsKey === prevTabsKeyRef.current) {
      setDisplayed({ tabs, activeKey });
      return;
    }
    prevTabsKeyRef.current = tabsKey;

    const sink = sinkExiting(regionRef.current, reducedMotion);
    const swap = () => {
      setDisplayed({ tabs, activeKey });
      floatEntering(regionRef.current, reducedMotion);
    };
    if (sink) sink.finished.then(swap).catch(swap);
    else swap();
  }, [tabsKey, tabs, activeKey, reducedMotion]);

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
      <div ref={regionRef} data-testid="portfolio-tabs-region" style={{ flex: 1, minWidth: 0 }}>
        <UnderlineTabs
          tabs={displayed.tabs}
          activeKey={displayed.activeKey}
          onChange={onChange}
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
