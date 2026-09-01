/**
 * The header's vertical arithmetic, pinned.
 *
 * `WalletHeader` draws the header row and `useTabChrome` tells every
 * screen where that header ends. They are two expressions of one layout, and
 * when they drift the header either overlaps the content or floats above it.
 * This suite pins the formula so the drift is a test failure, not a screenshot.
 */
import { renderHook } from '@testing-library/react-native';

const insets = { top: 59, bottom: 34, left: 0, right: 0 };

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => insets,
}));

// Real tokens rather than a hand-listed subset — see test-utils/themeTokens.
jest.mock('@salmon/shared', () => jest.requireActual('../test-utils/themeTokens'));

const { componentSizes, spacing } = jest.requireActual('../test-utils/themeTokens');

import { useTabChrome } from './useTabChrome';

describe('useTabChrome header metrics', () => {
  it('ends the header exactly at safe area + screenTop + the row', () => {
    const { result } = renderHook(() => useTabChrome());

    expect(result.current.headerChromeHeight).toBe(
      insets.top + spacing.screenTop + componentSizes.walletHeaderRowHeight
    );
    // Content starts where the row ends; the gap below it is the consumer's.
    expect(result.current.headerContentOffset).toBe(result.current.headerChromeHeight);
  });

  it('reserves the row, not the 56px header slot', () => {
    const { result } = renderHook(() => useTabChrome());

    // The regression this pins: reserving `headerHeight` centred the 38px row
    // inside 56px, dropping the header 9px and stealing 18px from the content.
    expect(result.current.headerChromeHeight).toBe(insets.top + 0 + 38);
    expect(result.current.headerChromeHeight).not.toBe(
      insets.top + spacing.screenTop + componentSizes.headerHeight
    );
  });
});
