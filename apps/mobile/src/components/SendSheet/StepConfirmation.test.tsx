import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: unknown) =>
      options && typeof options === 'object'
        ? `${key}:${Object.values(options as Record<string, unknown>).join(',')}`
        : key,
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const mockEstimateFee = jest.fn(async () => null);

jest.mock('@salmon/shared', () => ({
  chunkAddress: (address?: string | null) =>
    address ? address.replace(/(.{4})/g, '$1 ').trim() : '',
  semantic: {
    accent: { fill: '#FF5C45', onFill: '#070911' },
    border: { raised: '#6F7B95' },
    status: { success: '#33D6A6', danger: '#FF6B85' },
  },
  colors: {
    text: { primary: '#fff', secondary: '#aaa' },
    button: { cancelBackground: '#111', primaryText: '#070911' },
  },
  borderRadius: { md: 12, lg: 16 },
  borderWidth: { thin: 1 },
  componentSizes: { buttonHeightMedium: 48 },
  fontFamilyNative: { bold: 'System', medium: 'System', regular: 'System', mono: 'System' },
  fontScaleCap: { chrome: 1.2 },
  fontSize: { xs: 10, sm: 14, title: 32 },
  gradients: { primary: { colors: ['#FF5C45', '#E64A34'] } },
  motionMs: { feedbackHold: 2000 },
  ms: (value: number) => value,
  vs: (value: number) => value,
  s: (value: number) => value,
  opacity: { medium: 0.6 },
  shadows: { button: {} },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, base: 8, headerPadding: 16, '2xl': 24 },
  useSendTransaction: () => ({
    status: 'idle',
    error: null,
    feeEstimateFailed: false,
    estimateFee: mockEstimateFee,
    sendTransaction: jest.fn(),
    reset: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useBottomSheetChrome', () => ({
  useBottomSheetChrome: () => ({ actionRowBottomPadding: 0 }),
}));

jest.mock('../BlurContainer', () => {
  const { View } = require('react-native');
  return {
    BlurContainer: ({ children }: { children?: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock('../FleshBackground', () => ({
  FleshBackground: () => null,
}));

jest.mock('../Icon/SvgIcons', () => ({
  ContentCopySvgIcon: () => null,
}));

jest.mock('../TokenLogo', () => ({
  TokenLogo: () => null,
}));

import { StepConfirmation } from './StepConfirmation';

const RESOLVED = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const CHUNKED_RESOLVED = '7xKX tg2C W87d 97TX JSDp bD5j Bkhe TqA8 3TZR uJos gAsU';

const baseProps = {
  token: { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', decimals: 9 },
  amount: '1',
  blockchain: 'solana',
  account: {},
  onBack: () => {},
  onCancel: () => {},
  onSuccess: () => {},
} as never as React.ComponentProps<typeof StepConfirmation>;

describe('StepConfirmation destination address', () => {
  it('shows the resolved address, not the domain, when the recipient was a domain', () => {
    render(
      <StepConfirmation
        {...baseProps}
        recipientAddress="alice.sol"
        resolvedRecipientAddress={RESOLVED}
      />
    );

    expect(screen.getByTestId('send-confirm-address')).toHaveTextContent(CHUNKED_RESOLVED);
    expect(screen.getByTestId('send-confirm-resolved-from')).toHaveTextContent(
      'token.send.resolvedFrom:alice.sol'
    );
  });

  it('shows no domain line when the user pasted a plain address', () => {
    render(<StepConfirmation {...baseProps} recipientAddress={RESOLVED} />);

    expect(screen.getByTestId('send-confirm-address')).toHaveTextContent(CHUNKED_RESOLVED);
    expect(screen.queryByTestId('send-confirm-resolved-from')).toBeNull();
  });
});
