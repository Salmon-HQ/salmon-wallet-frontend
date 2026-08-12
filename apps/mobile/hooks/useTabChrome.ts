import { componentSizes, spacing, vs } from '@salmon/shared';
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_BAR_CONTENT_HEIGHT = componentSizes.tabBarItemHeight + 8;
const TAB_BAR_TOP_PADDING = spacing.lg;
const TAB_BAR_EXTRA_BOTTOM_GAP = spacing.sm;
const FLOATING_CTA_GAP = spacing.sm;
const STICKY_CTA_SCROLL_GAP = spacing['2xl'];

/**
 * Shared chrome metrics for the tab shell.
 *
 * Screens inside the tabs render under an absolute header and tab bar, so they
 * must all reserve the same top and bottom space to avoid overlapping system UI.
 */
export function useTabChrome() {
  const insets = useSafeAreaInsets();
  const { top: topInset, bottom: bottomInset } = insets;

  return useMemo(() => {
    const headerTopInset = topInset;
    const headerChromeHeight = headerTopInset + componentSizes.headerHeight;
    const headerContentOffset = headerTopInset + componentSizes.headerInnerHeight;

    // The balance hero intentionally underlaps the Android status bar area while
    // keeping the wallet header itself below the system UI.
    const heroCardTopInset = Platform.OS === 'ios' ? topInset : 0;

    const tabBarBottomPadding =
      Math.max(bottomInset, componentSizes.tabBarMinBottomPadding) + vs(TAB_BAR_EXTRA_BOTTOM_GAP);
    const tabBarTotalHeight =
      vs(TAB_BAR_TOP_PADDING) + vs(TAB_BAR_CONTENT_HEIGHT) + tabBarBottomPadding;
    const floatingBottomOffset = tabBarTotalHeight + vs(FLOATING_CTA_GAP);

    return {
      insets,
      topInset,
      headerTopInset,
      headerChromeHeight,
      headerContentOffset,
      heroCardTopInset,
      tabBarBottomPadding,
      tabBarTotalHeight,
      floatingBottomOffset,
      stickyCtaScrollPadding:
        floatingBottomOffset + vs(componentSizes.buttonHeightCompact + STICKY_CTA_SCROLL_GAP),
      scrollBottomPadding: Math.max(
        vs(componentSizes.tabBarScrollPadding),
        tabBarTotalHeight + vs(spacing['3xl'])
      ),
    };
  }, [bottomInset, insets, topInset]);
}

export default useTabChrome;
