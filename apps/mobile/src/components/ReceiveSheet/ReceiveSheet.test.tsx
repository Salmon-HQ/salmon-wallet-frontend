import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/hooks/useCopyFeedback'),
  semantic: {
    accent: { fill: '#FF5C45', onFill: '#070911' },
    text: { primary: '#F6F8FB', secondary: '#A7B1C4' },
    border: { raised: '#6F7B95' },
    surface: { raised: '#161C2D' },
    status: { success: '#33D6A6', danger: '#FF6B85', warning: '#FFB020' },
    depth: { abyss: '#070911' },
  },
  colors: {
    text: { primary: '#fff' },
    button: { primaryBackground: '#FF5C45', primaryText: '#070911' },
    status: { warningBackground: '#3A2C10', errorBackground: '#3A1620' },
  },
  fontSize: { xs: 10, sm: 14, base: 16, bodyLg: 18, '2xl': 24 },
  fontFamilyNative: { bold: 'System', semiBold: 'System', medium: 'System', regular: 'System' },
  letterSpacing: { wide: 0, change: 0 },
  lineHeight: { condensed: 1.2 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, headerPadding: 16 },
  borderRadius: { lg: 16, xl: 20, full: 9999 },
  componentSizes: {
    qrBorderWidth: 8,
    receiveContentGap: 16,
    copyButtonWidth: 160,
    buttonHeightCompact: 44,
  },
  ms: (value: number) => value,
  vs: (value: number) => value,
  s: (value: number) => value,
  getChainDisplayName: (chain?: string) =>
    chain === 'bitcoin' ? 'Bitcoin' : chain === 'ethereum' ? 'Ethereum' : 'Solana',
}));

jest.mock('../../../hooks/useBottomSheetChrome', () => ({
  useBottomSheetChrome: () => ({ bottomInset: 0, spaciousContentBottomPadding: 0 }),
}));

jest.mock('../BottomSheetContainer', () => {
  const { View } = require('react-native');
  return {
    BottomSheetContainer: ({ children }: { children?: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock('../FleshBackground', () => ({
  FleshBackground: () => null,
}));

// The QR encoder needs a canvas/SVG surface; chain identity does not depend
// on it.
jest.mock('../QRCode', () => ({
  __esModule: true,
  default: () => null,
}));

import { ReceiveSheet } from './ReceiveSheet';

const ADDRESS = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

describe('ReceiveSheet chain identity', () => {
  it('names the chain in a labelled badge', () => {
    render(<ReceiveSheet visible onClose={() => {}} address={ADDRESS} blockchain="solana" />);

    expect(screen.getByTestId('receive-chain-badge')).toHaveTextContent(
      'token.send.blockchainAddress:Solana'
    );
  });

  it('warns that only assets on that chain may be sent to this address', () => {
    render(<ReceiveSheet visible onClose={() => {}} address={ADDRESS} blockchain="bitcoin" />);

    expect(screen.getByText('token.receive.networkOnlyTitle:Bitcoin')).toBeTruthy();
    expect(screen.getByText('token.receive.networkOnlyBody:Bitcoin')).toBeTruthy();
  });
});
