/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/services/powerups', () => ({ getPowerupAvailability: vi.fn() }));

import { getPowerupAvailability } from '../api/services/powerups';
import { resetNetworkPowerupsCache, useNetworkPowerups } from './useNetworkPowerups';
import { EMPTY_POWERUP_ALLOWLIST } from '../utils/powerupSwitches';

const availability = vi.mocked(getPowerupAvailability);

describe("useNetworkPowerups — the caller's availability, fail closed", () => {
  beforeEach(() => {
    resetNetworkPowerupsCache();
    availability.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('is empty until the route answers, then carries ids, reasons and providers', async () => {
    availability.mockResolvedValue([
      { id: 'payments', enabled: true },
      { id: 'swap', enabled: true, provider: 'jupiter' },
      { id: 'memo', enabled: false, reason: 'maintenance' },
    ]);
    const { result } = renderHook(() => useNetworkPowerups('solana-mainnet'));
    expect(result.current).toBe(EMPTY_POWERUP_ALLOWLIST);
    await waitFor(() => expect(result.current.enabled).toEqual(['payments', 'swap']));
    expect(result.current.providers).toEqual({ swap: 'jupiter' });
    expect(result.current.disabled).toEqual({ memo: 'maintenance' });
    expect(availability).toHaveBeenCalledWith('solana-mainnet');
  });

  it('asks once when two Homes mount together, and both get the answer', async () => {
    availability.mockResolvedValue([{ id: 'swap', enabled: true }]);
    const a = renderHook(() => useNetworkPowerups('solana-mainnet'));
    const b = renderHook(() => useNetworkPowerups('solana-mainnet'));
    await waitFor(() => expect(a.result.current.enabled).toEqual(['swap']));
    await waitFor(() => expect(b.result.current.enabled).toEqual(['swap']));
    expect(availability).toHaveBeenCalledTimes(1);
  });

  it('never asks on a network without Powerups: the route exists only for Solana', async () => {
    const { result } = renderHook(() => useNetworkPowerups('bitcoin-mainnet'));
    await act(async () => {});
    expect(result.current).toBe(EMPTY_POWERUP_ALLOWLIST);
    expect(availability).not.toHaveBeenCalled();
  });

  it('reads the last answer synchronously on a later mount, and asks again', async () => {
    availability.mockResolvedValue([{ id: 'swap', enabled: true, provider: '0x' }]);
    const first = renderHook(() => useNetworkPowerups('solana-mainnet'));
    await waitFor(() => expect(first.result.current.enabled).toEqual(['swap']));
    first.unmount();

    const second = renderHook(() => useNetworkPowerups('solana-mainnet'));
    expect(second.result.current.providers).toEqual({ swap: '0x' });
    await waitFor(() => expect(availability).toHaveBeenCalledTimes(2));
  });

  it('closes when the route fails, and offers nothing without a network', async () => {
    availability.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useNetworkPowerups('solana-mainnet'));
    await waitFor(() => expect(availability).toHaveBeenCalled());
    await act(async () => {});
    expect(result.current).toBe(EMPTY_POWERUP_ALLOWLIST);

    const none = renderHook(() => useNetworkPowerups(null));
    expect(none.result.current).toBe(EMPTY_POWERUP_ALLOWLIST);
    expect(availability).toHaveBeenCalledTimes(1);
  });
});
