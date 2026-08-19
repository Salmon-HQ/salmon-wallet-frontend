import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockLogic: Record<string, unknown> = {};

// Reanimated pulls the Worklets native module, which does not exist under
// Jest; the step transitions only need a View and the reduce-motion flag.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useReducedMotion: () => false,
    withTiming: (toValue: unknown) => toValue,
    Easing: { bezier: () => () => 0 },
  };
});

// The real barrel pulls in @solana/kit, which jest-expo cannot transform.
// The motion vocabulary is real (pure theme tokens) so the step transition
// helpers can read it.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  useSwapScreenLogic: () => mockLogic,
  useBridgeSettlement: () => ({
    trackBridgeExchange: jest.fn(),
    isStalled: false,
    retryNow: jest.fn(),
  }),
  getTransactionUrl: () => 'https://solscan.io/tx/abc',
  getDefaultExplorer: () => 'solscan',
  fontFamilyNative: { semiBold: 'System' },
  fontSize: { sm: 12 },
  semantic: {
    depth: { column: '#0B0F19' },
    status: { warning: '#FFB020' },
  },
  spacing: { md: 12, lg: 16 },
}));

jest.mock('./SwapInputScreen', () => {
  const { View } = require('react-native');
  return { SwapInputScreen: () => <View testID="swap-input-screen" /> };
});
jest.mock('./SwapReviewScreen', () => {
  const { View } = require('react-native');
  return { SwapReviewScreen: () => <View testID="swap-review-screen" /> };
});
jest.mock('../TransactionSuccessScreen', () => {
  const { View } = require('react-native');
  return { TransactionSuccessScreen: () => <View testID="tx-success-screen" /> };
});
jest.mock('../TokenSelector', () => {
  const { View } = require('react-native');
  return { TokenSelectorModal: () => <View testID="token-selector-modal" /> };
});
jest.mock('../BridgeScreen/BridgeRecipientScreen', () => {
  const { View } = require('react-native');
  return { BridgeRecipientScreen: () => <View /> };
});
jest.mock('../BridgeScreen/BridgeReviewScreen', () => {
  const { View } = require('react-native');
  return { BridgeReviewScreen: () => <View /> };
});
jest.mock('../WarningNotice', () => {
  const { View } = require('react-native');
  return { WarningNotice: () => <View /> };
});
jest.mock('../DepthBackground', () => {
  const { View } = require('react-native');
  return { DepthBackground: () => <View testID="depth-background" /> };
});
jest.mock('../ScalesBackground', () => {
  const { View } = require('react-native');
  return {
    ScalesBackground: ({ variant }: { variant?: string }) => (
      <View testID="scales-background" accessibilityLabel={variant} />
    ),
  };
});

import { SwapScreen } from './SwapScreen';

const setLogic = (overrides: Record<string, unknown>) => {
  for (const key of Object.keys(mockLogic)) delete mockLogic[key];
  Object.assign(
    mockLogic,
    {
      step: 'input',
      swapMode: 'jupiter',
      inToken: null,
      outToken: null,
      inAmount: '',
      outAmount: '',
      successSummary: null,
      successExchange: null,
      successTxId: null,
      settling: false,
      isConfirming: false,
      showInTokenModal: false,
      showOutTokenModal: false,
      modalInTokens: [],
      modalOutTokens: [],
      modalFeaturedTokens: [],
      tokensLoading: false,
      isLoadingBridgeTokens: false,
      isLoadingQuote: false,
      isLoadingEstimate: false,
      canReview: false,
      reviewWarning: null,
      swapError: null,
      lastBridgeExchange: null,
      setInAmount: jest.fn(),
      setShowInTokenModal: jest.fn(),
      setShowOutTokenModal: jest.fn(),
      handleReview: jest.fn(),
      handleBackFromReview: jest.fn(),
      handleSuccessContinue: jest.fn(),
      handleSearchTokens: jest.fn(),
      handleInTokenModalSelect: jest.fn(),
      handleOutTokenModalSelect: jest.fn(),
    },
    overrides
  );
};

describe('SwapScreen task surface', () => {
  it('mounts the water column — ramp, snow, and deep-field scales — behind the success screen', () => {
    setLogic({ step: 'success' });
    render(<SwapScreen tokens={[]} onGetQuote={jest.fn()} onSwap={jest.fn()} />);

    expect(screen.getByTestId('tx-success-screen')).toBeTruthy();
    expect(screen.getByTestId('depth-background')).toBeTruthy();
    expect(screen.getByTestId('scales-background').props.accessibilityLabel).toBe('deepField');
  });
});
