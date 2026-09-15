/**
 * @vitest-environment jsdom
 *
 * What matters here: nothing is installed out of the box, an install is
 * persisted, and two consumers of the hook see the same list — Home's tab row
 * and the catalogue sheet floating over it are mounted at once, and an
 * install made in the sheet has to reach the row behind it.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../storage', () => ({
  getStorage: vi.fn(),
  STORAGE_KEYS: { INSTALLED_POWERUPS: 'salmon_installed_powerups' },
}));

import * as storage from '../storage';
import { resetInstalledPowerupsForTest, useInstalledPowerups } from './useInstalledPowerups';

const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  resetInstalledPowerupsForTest();
  mockStorage.getItem.mockResolvedValue(null);
  mockStorage.setItem.mockResolvedValue(undefined);
  vi.mocked(storage.getStorage).mockReturnValue(mockStorage as unknown as never);
});

describe('useInstalledPowerups', () => {
  it('installs nothing out of the box', async () => {
    const { result } = renderHook(() => useInstalledPowerups());
    await waitFor(() => expect(mockStorage.getItem).toHaveBeenCalled());
    expect(result.current.installed).toEqual([]);
    expect(result.current.isInstalled('memo')).toBe(false);
  });

  it('reads back what was stored', async () => {
    mockStorage.getItem.mockResolvedValue(['memo']);
    const { result } = renderHook(() => useInstalledPowerups());
    await waitFor(() => expect(result.current.isInstalled('memo')).toBe(true));
  });

  it('persists an install and an uninstall', async () => {
    const { result } = renderHook(() => useInstalledPowerups());
    await waitFor(() => expect(mockStorage.getItem).toHaveBeenCalled());

    act(() => result.current.install('memo'));
    expect(result.current.installed).toEqual(['memo']);
    await waitFor(() =>
      expect(mockStorage.setItem).toHaveBeenCalledWith('salmon_installed_powerups', ['memo'])
    );

    act(() => result.current.uninstall('memo'));
    expect(result.current.installed).toEqual([]);
  });

  it('shows one consumer what another installed', async () => {
    const row = renderHook(() => useInstalledPowerups());
    const sheet = renderHook(() => useInstalledPowerups());
    await waitFor(() => expect(mockStorage.getItem).toHaveBeenCalled());

    act(() => sheet.result.current.install('memo'));

    expect(row.result.current.installed).toEqual(['memo']);
  });
});
