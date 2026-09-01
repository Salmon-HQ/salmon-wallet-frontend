import { componentSizes, spacing, vs } from '@salmon/shared';
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STICKY_CTA_SCROLL_GAP = spacing['2xl'];

/**
 * Shared chrome metrics for the tab shell.
 *
 * Screens inside the tabs render under an absolute header, so they must all
 * reserve the same top space to avoid overlapping system UI. Bottom spacing
 * for floating CTAs and scrollable content now derives from the safe-area
 * bottom inset alone — there is no bottom tab bar to clear.
 */
export function useTabChrome() {
  const insets = useSafeAreaInsets();
  const { top: topInset, bottom: bottomInset } = insets;

  return useMemo(() => {
    const headerTopInset = topInset;
    // The header no longer paints a band: it is the screen's top padding
    // (safe area + `screenTop`) followed by the header row, on the same plane
    // as the balance below it. `GateContainer` computes the same three terms
    // for its collapse math — keep them in step or the header and the content
    // overlap. Unscaled, like every other expression defining this slot.
    // The last term is the row's own height (its 38px thumb), never the 56px
    // `headerHeight` slot: a slot centres the row and drops it 9px below the
    // screen's top padding while stealing 18px from the content underneath.
    const headerChromeHeight =
      headerTopInset + spacing.screenTop + componentSizes.walletHeaderRowHeight;
    // Content starts exactly where the header row ends; the gap between them
    // is the consumer's (`index.tsx` adds the `.pen`'s 20).
    const headerContentOffset = headerChromeHeight;

    // The balance hero intentionally underlaps the Android status bar area while
    // keeping the wallet header itself below the system UI.
    const heroCardTopInset = Platform.OS === 'ios' ? topInset : 0;

    const floatingBottomOffset = bottomInset + vs(spacing.screenBottom);

    return {
      insets,
      topInset,
      headerTopInset,
      headerChromeHeight,
      headerContentOffset,
      heroCardTopInset,
      floatingBottomOffset,
      stickyCtaScrollPadding:
        floatingBottomOffset + vs(componentSizes.buttonHeightCompact + STICKY_CTA_SCROLL_GAP),
      scrollBottomPadding: floatingBottomOffset + vs(spacing['3xl']),
    };
  }, [bottomInset, topInset, insets]);
}

export default useTabChrome;
