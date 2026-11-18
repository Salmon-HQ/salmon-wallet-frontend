import { spacing, vs } from '@salmon/shared';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Shared chrome metrics for bottom sheets.
 *
 * Bottom sheets run edge-to-edge on Android, so scroll content and sticky
 * action rows must reserve the device's bottom system inset in addition to
 * their visual spacing.
 */
export function useBottomSheetChrome() {
  const insets = useSafeAreaInsets();
  const { bottom: bottomInset } = insets;

  return useMemo(() => {
    const withBottomInset = (padding: number) => bottomInset + padding;

    return {
      bottomInset,
      insets,
      withBottomInset,
      compactContentBottomPadding: withBottomInset(vs(spacing.xl)),
      standardContentBottomPadding: withBottomInset(vs(spacing['3.5xl'])),
      spaciousContentBottomPadding: withBottomInset(vs(spacing['4xl'])),
      actionRowBottomPadding: withBottomInset(vs(spacing.sheetBottomPadding)),
    };
  }, [bottomInset, insets]);
}
