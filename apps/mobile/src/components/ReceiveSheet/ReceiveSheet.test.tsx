import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/hooks/useCopyFeedback'),
  // The mobile wrapper hook reads the real motion vocabulary.
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
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
  fontSize: { xs: 10, sm: 14, base: 16, mono: 13, bodyLg: 18, '2xl': 24 },
  fontFamilyNative: {
    bold: 'System',
    semiBold: 'System',
    medium: 'System',
    regular: 'System',
    mono: 'GeistMonoRegular',
  },
  letterSpacing: { wide: 0, change: 0 },
  lineHeight: { condensed: 1.2, snug: 1.4 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, headerPadding: 16 },
  borderRadius: { r1: 4, lg: 16, xl: 20, full: 9999 },
  chunkAddress: (address: string) => address.replace(/(.{4})/g, '$1 ').trim(),
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

// The sheet's ground material is not under test here; mocking it keeps the
// suite off react-native-svg and the accessibility probes.
jest.mock('../Thermocline', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    Thermocline: (props: Record<string, unknown>) =>
      ReactActual.createElement(View, { ...props, testID: 'thermocline' }),
  };
});

jest.mock('../FleshBackground', () => ({
  FleshBackground: () => null,
}));

// The QR encoder needs a canvas/SVG surface; render a prop-carrying stand-in
// so the suite can assert what the sheet asks of the code (e.g. level-H).
jest.mock('../QRCode', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) =>
      ReactActual.createElement(View, { ...props, testID: 'qr-code' }),
  };
});

// The mark is react-native-svg; the sheet only needs it to exist.
jest.mock('../BrandMark', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    BrandMark: (props: Record<string, unknown>) =>
      ReactActual.createElement(View, { ...props, testID: 'brand-mark' }),
  };
});

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

describe('ReceiveSheet address', () => {
  it('renders the address in mono, chunked, with leading derived from its size', () => {
    render(<ReceiveSheet visible onClose={() => {}} address={ADDRESS} blockchain="solana" />);

    const address = screen.getByTestId('receive-address');
    const style = StyleSheet.flatten(address.props.style);

    expect(address.props.children).toBe(
      '7xKX tg2C W87d 97TX JSDp bD5j Bkhe TqA8 3TZR uJos gAsU'
    );
    expect(style.fontFamily).toBe('GeistMonoRegular');
    expect(style.fontSize).toBe(13);
    // Wrapped chunks collided when the leading was a literal unrelated to the size.
    expect(style.lineHeight).toBeGreaterThan(style.fontSize);
  });
});

describe('ReceiveSheet shapes and labels', () => {
  it('gives the chain chip the chip radius, not a pill', () => {
    render(<ReceiveSheet visible onClose={() => {}} address={ADDRESS} blockchain="solana" />);

    const chip = screen.getByTestId('receive-chain-badge');
    expect(StyleSheet.flatten(chip.props.style).borderRadius).toBe(4);
  });

  it('renders the copy label as its translation says, with no text transform', () => {
    render(<ReceiveSheet visible onClose={() => {}} address={ADDRESS} blockchain="solana" />);

    const label = screen.getByText('token.receive.copyAddress');
    expect(StyleSheet.flatten(label.props.style).textTransform).toBeUndefined();
  });
});

describe('ReceiveSheet QR brand mark', () => {
  it('centers the salmon mark on a knockout over a level-H code', () => {
    render(<ReceiveSheet visible onClose={() => {}} address={ADDRESS} blockchain="solana" />);

    // The mark hides modules, so the code must carry level-H redundancy.
    expect(screen.getByTestId('qr-code').props.ecLevel).toBe('H');
    expect(screen.getByTestId('receive-qr-logo')).toBeTruthy();
    expect(screen.getByTestId('brand-mark')).toBeTruthy();
  });
});
