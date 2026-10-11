/**
 * What the device offers a Powerup that needs more than a network (spec 040):
 * Seed Vault, asked once per session.
 */
import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('./bridge', () => ({ isSeedVaultAvailable: jest.fn() }));

import { isSeedVaultAvailable } from './bridge';
import { resetDeviceCapabilities, useDeviceCapabilities } from './useDeviceCapabilities';

beforeEach(() => {
  jest.clearAllMocks();
  resetDeviceCapabilities();
});

describe('useDeviceCapabilities', () => {
  it('reports Seed Vault on a device that has it', async () => {
    jest.mocked(isSeedVaultAvailable).mockResolvedValue(true);

    const { result } = renderHook(() => useDeviceCapabilities());

    expect(result.current).toEqual([]);
    await waitFor(() => expect(result.current).toEqual(['seed-vault']));
  });

  it('reports nothing elsewhere, and asks the device only once', async () => {
    jest.mocked(isSeedVaultAvailable).mockResolvedValue(false);

    const first = renderHook(() => useDeviceCapabilities());
    await waitFor(() => expect(isSeedVaultAvailable).toHaveBeenCalledTimes(1));
    const second = renderHook(() => useDeviceCapabilities());

    expect(second.result.current).toEqual([]);
    expect(first.result.current).toEqual([]);
    expect(isSeedVaultAvailable).toHaveBeenCalledTimes(1);
  });
});
