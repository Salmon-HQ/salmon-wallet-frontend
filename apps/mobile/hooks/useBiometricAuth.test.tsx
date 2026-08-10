import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useBiometricAuth } from './useBiometricAuth';

const mockGetItemAsync = jest.fn();
const mockSetItemAsync = jest.fn();
const mockDeleteItemAsync = jest.fn();
const mockHasHardwareAsync = jest.fn();
const mockIsEnrolledAsync = jest.fn();
const mockSupportedAuthenticationTypesAsync = jest.fn();
const mockAuthenticateAsync = jest.fn();

jest.mock('expo-secure-store', () => ({
  getItemAsync: (...args: unknown[]) => mockGetItemAsync(...args),
  setItemAsync: (...args: unknown[]) => mockSetItemAsync(...args),
  deleteItemAsync: (...args: unknown[]) => mockDeleteItemAsync(...args),
}));

jest.mock('expo-local-authentication', () => ({
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
  hasHardwareAsync: (...args: unknown[]) => mockHasHardwareAsync(...args),
  isEnrolledAsync: (...args: unknown[]) => mockIsEnrolledAsync(...args),
  supportedAuthenticationTypesAsync: (...args: unknown[]) => mockSupportedAuthenticationTypesAsync(...args),
  authenticateAsync: (...args: unknown[]) => mockAuthenticateAsync(...args),
}));

describe('useBiometricAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasHardwareAsync.mockResolvedValue(true);
    mockIsEnrolledAsync.mockResolvedValue(true);
    mockSupportedAuthenticationTypesAsync.mockResolvedValue([1]);
    mockGetItemAsync.mockImplementation((key: string) => {
      if (key === 'salmon_biometric_key_exists') return Promise.resolve('true');
      if (key === 'salmon_biometric_enabled') return Promise.resolve('true');
      return Promise.resolve(null);
    });
    mockSetItemAsync.mockResolvedValue(undefined);
    mockDeleteItemAsync.mockResolvedValue(undefined);
    mockAuthenticateAsync.mockResolvedValue({ success: true });
  });

  describe('storeKeyForBiometric', () => {
    const renderReadyHook = async () => {
      const { result } = renderHook(() => useBiometricAuth());
      await waitFor(() => {
        expect(result.current.state.isReady).toBe(true);
      });
      return result;
    };

    it('prompts for biometrics before writing the key', async () => {
      const result = await renderReadyHook();

      await act(async () => {
        await result.current.storeKeyForBiometric('{"key":"value"}');
      });

      expect(mockAuthenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ disableDeviceFallback: true }),
      );
      expect(mockSetItemAsync).toHaveBeenCalledWith(
        'salmon_biometric_key',
        '{"key":"value"}',
        expect.objectContaining({ requireAuthentication: true }),
      );
    });

    it('reports "stored" and flags the key as present on success', async () => {
      const result = await renderReadyHook();

      let outcome: string | undefined;
      await act(async () => {
        outcome = await result.current.storeKeyForBiometric('{"key":"value"}');
      });

      expect(outcome).toBe('stored');
      expect(mockSetItemAsync).toHaveBeenCalledWith('salmon_biometric_key_exists', 'true');
      expect(result.current.state.hasStoredKey).toBe(true);
    });

    it('writes nothing and reports "cancelled" when the user dismisses the prompt', async () => {
      mockAuthenticateAsync.mockResolvedValueOnce({ success: false, error: 'user_cancel' });
      const result = await renderReadyHook();
      mockSetItemAsync.mockClear();

      let outcome: string | undefined;
      await act(async () => {
        outcome = await result.current.storeKeyForBiometric('{"key":"value"}');
      });

      expect(outcome).toBe('cancelled');
      expect(mockSetItemAsync).not.toHaveBeenCalled();
    });

    it('reports "failed" when authentication errors out', async () => {
      mockAuthenticateAsync.mockResolvedValueOnce({ success: false, error: 'lockout' });
      const result = await renderReadyHook();
      mockSetItemAsync.mockClear();

      let outcome: string | undefined;
      await act(async () => {
        outcome = await result.current.storeKeyForBiometric('{"key":"value"}');
      });

      expect(outcome).toBe('failed');
      expect(mockSetItemAsync).not.toHaveBeenCalled();
    });
  });

  it('clears biometric preference and all stored biometric artifacts when disabled', async () => {
    const { result } = renderHook(() => useBiometricAuth());

    await waitFor(() => {
      expect(result.current.state.isReady).toBe(true);
    });

    await act(async () => {
      await result.current.setEnableBiometric(false);
    });

    expect(mockSetItemAsync).toHaveBeenCalledWith('salmon_biometric_enabled', 'false');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('salmon_biometric_key');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('salmon_biometric_key_marker');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('salmon_biometric_key_exists');
    expect(result.current.enableBiometric).toBe(false);
    expect(result.current.state.hasStoredKey).toBe(false);
  });

  it('clears biometric artifacts when secure-store access fails after enrollment changed', async () => {
    jest.useFakeTimers();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useBiometricAuth());

    await waitFor(() => {
      expect(result.current.state.isReady).toBe(true);
    });

    mockGetItemAsync.mockRejectedValueOnce(new Error('Key permanently invalidated'));

    await act(async () => {
      const storedKey = await result.current.authenticateWithBiometric();
      expect(storedKey).toBeNull();
    });

    expect(mockDeleteItemAsync).toHaveBeenCalledWith('salmon_biometric_key');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('salmon_biometric_key_marker');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('salmon_biometric_key_exists');
    expect(result.current.state.hasStoredKey).toBe(false);
    jest.runOnlyPendingTimers();
    consoleErrorSpy.mockRestore();
    jest.useRealTimers();
  });
});
