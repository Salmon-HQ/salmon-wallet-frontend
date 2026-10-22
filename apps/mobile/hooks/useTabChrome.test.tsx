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
const HEADER_INSETS = { ...insets };

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

/**
 * A bottom action sits as far above the system bar as Home's Powerups button,
 * whoever owns the safe-area inset. The FAB is absolute on a screen with no
 * SafeAreaView bottom edge, at `bottom: floatingBottomOffset`; an action row
 * inside a SafeAreaView that owns the inset adds `screenActionBottomPadding`
 * on top of it. Reading `floatingBottomOffset` there counted the inset twice
 * and floated the button far above the floor on Android.
 */
describe('useTabChrome bottom action metrics', () => {
  afterEach(() => Object.assign(insets, HEADER_INSETS));

  it.each([
    ['three-button navigation', 48],
    ['gesture navigation', 24],
    ['the iPhone home indicator', 34],
  ])('puts a row inside the safe area where the Powerups button sits, on %s', (_, bottom) => {
    insets.bottom = bottom;
    const { result } = renderHook(() => useTabChrome());

    const fabFromFloor = result.current.floatingBottomOffset;
    const rowFromFloor = bottom + result.current.screenActionBottomPadding;
    expect(rowFromFloor).toBe(fabFromFloor);
    expect(fabFromFloor).toBe(bottom + spacing.screenBottom);
  });

  it('carries no inset in the in-safe-area padding', () => {
    insets.bottom = 48;
    const { result } = renderHook(() => useTabChrome());

    expect(result.current.screenActionBottomPadding).toBe(spacing.screenBottom);
  });
});
