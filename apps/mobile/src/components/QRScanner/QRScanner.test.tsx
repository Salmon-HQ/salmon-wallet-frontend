import React from 'react';
import { Linking } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

const mockClassify = jest.fn();
const mockRequestPermission = jest.fn();
var mockPermission: { granted: boolean; canAskAgain: boolean } | null;

jest.mock('@salmon/shared', () => ({
  // "Deep Water" semantic tokens. Components read these directly now.
  semantic: {
    accent: { fill: '#FF5C45', onFill: '#070911', ink: '#FF5C45', tint: 'rgba(255,92,69,0.1)' },
    text: {
      primary: '#F6F8FB',
      secondary: '#A7B1C4',
      tertiary: '#8B96AD',
      disabled: '#6F7B95',
      accent: '#FF5C45',
      onAccent: '#070911',
      onGlass: '#F6F8FB',
    },
    border: { default: '#58637B', raised: '#6F7B95', strong: '#8B96AD' },
    surface: { shelf: '#10131C', raised: '#161C2D', crest: '#1B2233', bedrock: '#0B0F19' },
    status: { success: '#33D6A6', danger: '#FF6B85', warning: '#FFB020' },
    state: { hover: 'rgba(199,211,232,0.06)', press: 'rgba(199,211,232,0.10)' },
    scanner: {
      ground: '#000',
      frame: '#111',
      corner: '#222',
      hint: '#ccc',
    },
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, '2xl': 24, '3xl': 28, '5xl': 40 },
  borderRadius: { lg: 16 },
  fontFamilyNative: { semiBold: 'System' },
  fontSize: { bodyLg: 18, heading: 20, title: 24 },
  fontWeight: { semibold: '600' },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

jest.mock('./scan-payload', () => ({
  classifyScanPayload: (...args: unknown[]) => mockClassify(...args),
}));

jest.mock('expo-camera', () => ({
  CameraView: jest.fn(() => null),
  useCameraPermissions: () => [mockPermission, mockRequestPermission],
}));

import { CameraView } from 'expo-camera';
import { QRScanner } from './QRScanner';

const scanFrame = (data: string) => {
  const props = (CameraView as unknown as jest.Mock).mock.calls.at(-1)?.[0];
  act(() => props.onBarcodeScanned({ data }));
};

describe('QRScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermission = { granted: true, canAskAgain: true };
  });

  it('renders nothing when hidden', () => {
    render(
      <QRScanner visible={false} blockchain="solana" onScan={jest.fn()} onClose={jest.fn()} />
    );

    expect(screen.queryByTestId('qr-scanner-close-button')).toBeNull();
    expect(CameraView).not.toHaveBeenCalled();
  });

  it('requests permission when opened and not yet granted', () => {
    mockPermission = { granted: false, canAskAgain: true };

    render(<QRScanner visible blockchain="solana" onScan={jest.fn()} onClose={jest.fn()} />);

    expect(mockRequestPermission).toHaveBeenCalled();
    expect(CameraView).not.toHaveBeenCalled();
  });

  it('shows the permission-denied state with a route to Settings', () => {
    mockPermission = { granted: false, canAskAgain: false };
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);

    render(<QRScanner visible blockchain="solana" onScan={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByTestId('qr-scanner-permission-denied')).toBeTruthy();
    expect(mockRequestPermission).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('qr-scanner-settings-button'));
    expect(openSettings).toHaveBeenCalled();
  });

  it('rejects an invalid payload, keeps scanning, then accepts a valid one', () => {
    const onScan = jest.fn();
    mockClassify.mockReturnValueOnce({ kind: 'notAddress' });

    render(<QRScanner visible blockchain="solana" onScan={onScan} onClose={jest.fn()} />);

    scanFrame('https://example.com');

    expect(onScan).not.toHaveBeenCalled();
    expect(screen.getByText('This code is not a valid address')).toBeTruthy();

    mockClassify.mockReturnValueOnce({
      kind: 'valid',
      address: 'ValidAddress',
      amount: '2',
    });
    scanFrame('ValidAddress');

    expect(onScan).toHaveBeenCalledWith({
      data: 'ValidAddress',
      address: 'ValidAddress',
      amount: '2',
    });
  });

  it('distinguishes a wrong-chain address in the rejection message', () => {
    mockClassify.mockReturnValue({ kind: 'wrongChain' });

    render(<QRScanner visible blockchain="solana" onScan={jest.fn()} onClose={jest.fn()} />);

    scanFrame('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');

    expect(screen.getByText('This address belongs to a different network')).toBeTruthy();
  });

  it('handles a successful decode exactly once per scan session', () => {
    const onScan = jest.fn();
    mockClassify.mockReturnValue({ kind: 'valid', address: 'ValidAddress' });

    render(<QRScanner visible blockchain="solana" onScan={onScan} onClose={jest.fn()} />);

    scanFrame('ValidAddress');
    scanFrame('ValidAddress');
    scanFrame('OtherAddress');

    expect(onScan).toHaveBeenCalledTimes(1);
  });

  it('calls onClose from the close button', () => {
    const onClose = jest.fn();

    render(<QRScanner visible blockchain="solana" onScan={jest.fn()} onClose={onClose} />);

    fireEvent.press(screen.getByTestId('qr-scanner-close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
