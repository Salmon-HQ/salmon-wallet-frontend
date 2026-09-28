/**
 * @vitest-environment jsdom
 *
 * What matters here: a slice hydrates from one shared key, a write reaches
 * every mounted reader and storage, two Powerups never see each other's slice,
 * and a functional update composes with a write made in the same tick.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../storage', () => ({
  getStorage: vi.fn(),
  STORAGE_KEYS: { POWERUP_STATE: 'salmon_powerup_state' },
}));

import * as storage from '../storage';
import { resetPowerupStateForTest, usePowerupState } from './usePowerupState';

const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

const INITIAL = { requests: [] as string[] };

beforeEach(() => {
  vi.clearAllMocks();
  resetPowerupStateForTest();
  mockStorage.getItem.mockResolvedValue(null);
  mockStorage.setItem.mockResolvedValue(undefined);
  vi.mocked(storage.getStorage).mockReturnValue(mockStorage as unknown as never);
});

describe('usePowerupState', () => {
  it('stands on the initial value until storage answers, then hydrates the slice', async () => {
    mockStorage.getItem.mockResolvedValue({ payments: { requests: ['a'] } });
    const { result } = renderHook(() => usePowerupState('payments', INITIAL));
    expect(result.current[0]).toBe(INITIAL);
    await waitFor(() => expect(result.current[0]).toEqual({ requests: ['a'] }));
    expect(mockStorage.getItem).toHaveBeenCalledWith('salmon_powerup_state');
  });

  it('writes through to storage under the Powerup id, and every reader sees it', async () => {
    const first = renderHook(() => usePowerupState('payments', INITIAL));
    const second = renderHook(() => usePowerupState('payments', INITIAL));
    await waitFor(() => expect(mockStorage.getItem).toHaveBeenCalled());

    act(() => first.result.current[1]({ requests: ['a'] }));

    expect(second.result.current[0]).toEqual({ requests: ['a'] });
    await waitFor(() =>
      expect(mockStorage.setItem).toHaveBeenCalledWith('salmon_powerup_state', {
        payments: { requests: ['a'] },
      })
    );
  });

  it('keeps one Powerup out of another', async () => {
    mockStorage.getItem.mockResolvedValue({ stake: { positions: 2 } });
    const payments = renderHook(() => usePowerupState('payments', INITIAL));
    const stake = renderHook(() => usePowerupState('stake', { positions: 0 }));
    await waitFor(() => expect(stake.result.current[0]).toEqual({ positions: 2 }));
    expect(payments.result.current[0]).toBe(INITIAL);

    act(() => payments.result.current[1]({ requests: ['b'] }));
    expect(stake.result.current[0]).toEqual({ positions: 2 });
    expect(mockStorage.setItem).toHaveBeenLastCalledWith('salmon_powerup_state', {
      stake: { positions: 2 },
      payments: { requests: ['b'] },
    });
  });

  it('composes functional updates made in one tick, without mutating the previous slice', async () => {
    const { result } = renderHook(() => usePowerupState('payments', INITIAL));
    await waitFor(() => expect(mockStorage.getItem).toHaveBeenCalled());

    act(() => {
      result.current[1]((prev) => ({ requests: [...prev.requests, 'a'] }));
      result.current[1]((prev) => ({ requests: [...prev.requests, 'b'] }));
    });

    expect(result.current[0]).toEqual({ requests: ['a', 'b'] });
    expect(INITIAL.requests).toEqual([]);
  });

  it('ignores a stored value that is not a record', async () => {
    mockStorage.getItem.mockResolvedValue(['not', 'a', 'record']);
    const { result } = renderHook(() => usePowerupState('payments', INITIAL));
    await waitFor(() => expect(mockStorage.getItem).toHaveBeenCalled());
    expect(result.current[0]).toBe(INITIAL);
  });
});
