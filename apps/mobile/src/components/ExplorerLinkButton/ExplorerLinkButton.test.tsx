/**
 * The press has to reach the system browser. It stopped doing that once,
 * silently: `Linking` is an instance and `openURL` a prototype method that
 * reads `this`, so a bare `Linking.openURL` handed across the platform seam
 * threw inside the hook's `try` and the tap did nothing at all.
 *
 * The single-explorer case is the whole test surface here: no picker mounts,
 * so the press goes straight to the open. The picker's own behaviour is the
 * shared hook's suite.
 */
import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options?.name ? `${key}:${String(options.name)}` : key,
  }),
}));

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../test-utils/themeTokens'),
  ...jest.requireActual('@salmon/shared/src/hooks/useExplorerLink'),
  ...jest.requireActual('@salmon/shared/src/config/explorers'),
  useParentSheetHeight: () => undefined,
  useSheetParent: () => null,
  ...jest.requireActual('@salmon/shared/src/contexts/useSheetTurn'),
  ...jest.requireActual('@salmon/shared/src/hooks/useHeldSheetSize'),
  SheetParentContext: jest.requireActual('@salmon/shared/src/contexts/SheetHeightContext')
    .SheetParentContext,
}));

// No worklets runtime in Jest: the outlined button pulls reanimated in
// through the kit's press motion, so both need plain-JS stand-ins.
jest.mock('react-native-reanimated', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RNView,
      createAnimatedComponent: (Component: React.ComponentType<Record<string, unknown>>) =>
        ReactActual.forwardRef((props: Record<string, unknown>, ref: unknown) =>
          ReactActual.createElement(Component, { ...props, ref })
        ),
    },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (target: unknown) => target,
    withSpring: (target: unknown) => target,
    withDelay: (_delay: unknown, target: unknown) => target,
    runOnJS: (fn: unknown) => fn,
    Easing: { bezier: () => () => 0, linear: () => 0, out: (fn: unknown) => fn },
  };
});

jest.mock('../../../hooks/usePressMotion', () => ({
  usePressMotion: () => ({
    pressStyle: {},
    scale: { value: 1 },
    pressHandlers: { onPressIn: () => {}, onPressOut: () => {} },
    specular: { x: { value: 0 }, y: { value: 0 }, opacity: { value: 0 } },
  }),
}));

jest.mock('../PressSpecular', () => ({
  PressSpecular: () => null,
  SPECULAR_OPACITY: 0.12,
}));

jest.mock('../../../hooks/useBottomSheetChrome', () => ({
  useBottomSheetChrome: () => ({ standardContentBottomPadding: 0 }),
}));

import { ExplorerLinkButton } from './ExplorerLinkButton';

const TX = '5xTestSignature';

describe('ExplorerLinkButton', () => {
  afterEach(() => jest.restoreAllMocks());

  it('opens the explorer with `Linking` as the receiver, not a bare reference', async () => {
    // `function`, not an arrow: the mock records the `this` the call site used,
    // which is the whole point — a bare method reference arrives with none.
    const receivers: unknown[] = [];
    jest.spyOn(Linking, 'openURL').mockImplementation(function (this: unknown) {
      receivers.push(this);
      return Promise.resolve();
    });

    render(<ExplorerLinkButton txHash={TX} blockchain="SOLANA" environment="solana-mainnet" />);
    fireEvent.press(screen.getByTestId('tx-detail-explorer-link'));

    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledTimes(1));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining(TX));
    // Compared as a boolean so a failure reads "false", not a serialised module.
    expect(receivers.map((receiver) => receiver === Linking)).toEqual([true]);
  });

  it('says the open failed, under the button that was pressed', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no browser'));

    render(<ExplorerLinkButton txHash={TX} blockchain="SOLANA" environment="solana-mainnet" />);
    expect(screen.queryByTestId('tx-detail-explorer-error')).toBeNull();

    fireEvent.press(screen.getByTestId('tx-detail-explorer-link'));

    await waitFor(() => expect(screen.getByTestId('tx-detail-explorer-error')).toBeTruthy());
    expect(screen.getByText('transactions.detail.explorerOpenFailed')).toBeTruthy();
  });
});
