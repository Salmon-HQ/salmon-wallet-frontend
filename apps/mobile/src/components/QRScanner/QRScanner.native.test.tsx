import React from 'react';
import { Linking } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

const mockClassify = jest.fn();
const mockRequestPermission = jest.fn();
var mockPermission: { granted: boolean; canAskAgain: boolean } | null;

jest.mock('@salmon/shared', () => ({
  colors: {
    scanner: {
      background: '#000',
      surface: '#111',
      text: '#fff',
      textSecondary: '#ccc',
      button: '#222',
    },
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, '2xl': 24, '3xl': 28, '5xl': 40 },
  borderRadius: { lg: 16 },
  fontFamilyNative: { semiBold: 'System' },
  fontSize: { md: 18, lg: 20, xl: 24 },
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
import { QRScanner } from './QRScanner.native';

const scanFrame = (data: string) => {
  const props = (CameraView as unknown as jest.Mock).mock.calls.at(-1)?.[0];
  act(() => props.onBarcodeScanned({ data }));
};

describe('QRScanner.native', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermission = { granted: true, canAskAgain: true };
  });

  it('renders nothing when hidden', () => {
    render(
      <QRScanner
        visible={false}
        blockchain="solana"
        onScan={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.queryByTestId('qr-scanner-close-button')).toBeNull();
    expect(CameraView).not.toHaveBeenCalled();
  });

  it('requests permission when opened and not yet granted', () => {
    mockPermission = { granted: false, canAskAgain: true };

    render(
      <QRScanner
        visible
        blockchain="solana"
        onScan={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(mockRequestPermission).toHaveBeenCalled();
    expect(CameraView).not.toHaveBeenCalled();
  });

  it('shows the permission-denied state with a route to Settings', () => {
    mockPermission = { granted: false, canAskAgain: false };
    const openSettings = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);

    render(
      <QRScanner
        visible
        blockchain="solana"
        onScan={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId('qr-scanner-permission-denied')).toBeTruthy();
    expect(mockRequestPermission).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('qr-scanner-settings-button'));
    expect(openSettings).toHaveBeenCalled();
  });

  it('rejects an invalid payload, keeps scanning, then accepts a valid one', () => {
    const onScan = jest.fn();
    mockClassify.mockReturnValueOnce({ kind: 'notAddress' });

    render(
      <QRScanner
        visible
        blockchain="solana"
        onScan={onScan}
        onClose={jest.fn()}
      />
    );

    scanFrame('https://example.com');

    expect(onScan).not.toHaveBeenCalled();
    expect(
      screen.getByText('This code is not a valid address')
    ).toBeTruthy();

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

    render(
      <QRScanner
        visible
        blockchain="solana"
        onScan={jest.fn()}
        onClose={jest.fn()}
      />
    );

    scanFrame('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');

    expect(
      screen.getByText('This address belongs to a different network')
    ).toBeTruthy();
  });

  it('handles a successful decode exactly once per scan session', () => {
    const onScan = jest.fn();
    mockClassify.mockReturnValue({ kind: 'valid', address: 'ValidAddress' });

    render(
      <QRScanner
        visible
        blockchain="solana"
        onScan={onScan}
        onClose={jest.fn()}
      />
    );

    scanFrame('ValidAddress');
    scanFrame('ValidAddress');
    scanFrame('OtherAddress');

    expect(onScan).toHaveBeenCalledTimes(1);
  });

  it('calls onClose from the close button', () => {
    const onClose = jest.fn();

    render(
      <QRScanner
        visible
        blockchain="solana"
        onScan={jest.fn()}
        onClose={onClose}
      />
    );

    fireEvent.press(screen.getByTestId('qr-scanner-close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
