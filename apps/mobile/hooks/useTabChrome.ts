import { componentSizes, spacing, vs } from '@salmon/shared';
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STICKY_CTA_SCROLL_GAP = spacing['2xl'];

/**
 * Shared chrome metrics for the tab shell.
 *
 * `headerChromeHeight` is the top space a screen without its own header row
 * has to reserve so its content clears the system UI — Swap's, today. Home no
 * longer reads it: its `WalletHeader` is laid out in flow and owns that space
 * itself. Bottom spacing for floating CTAs and scrollable content derives from
 * the safe-area bottom inset alone — there is no bottom tab bar to clear.
 */
export function useTabChrome() {
  const insets = useSafeAreaInsets();
  const { top: topInset, bottom: bottomInset } = insets;

  return useMemo(() => {
    const headerTopInset = topInset;
    // The header no longer paints a band: it is the screen's top padding
    // (safe area + `screenTop`) followed by the header row, on the same plane
    // as the balance below it. `WalletHeader` computes the same three terms
    // for its own slot. Unscaled, like every other expression defining it.
    // The last term is the row's own height (its 38px thumb), never the 56px
    // `headerHeight` slot: a slot centres the row and drops it 9px below the
    // screen's top padding while stealing 18px from the content underneath.
    const headerChromeHeight =
      headerTopInset + spacing.screenTop + componentSizes.walletHeaderRowHeight;
    // The balance hero intentionally underlaps the Android status bar area while
    // keeping the wallet header itself below the system UI.
    const heroCardTopInset = Platform.OS === 'ios' ? topInset : 0;

    const floatingBottomOffset = bottomInset + vs(spacing.screenBottom);

    return {
      insets,
      topInset,
      headerTopInset,
      headerChromeHeight,
      heroCardTopInset,
      floatingBottomOffset,
      stickyCtaScrollPadding:
        floatingBottomOffset + vs(componentSizes.buttonHeightCompact + STICKY_CTA_SCROLL_GAP),
      scrollBottomPadding: floatingBottomOffset + vs(spacing['3xl']),
    };
  }, [bottomInset, topInset, insets]);
}

export default useTabChrome;
