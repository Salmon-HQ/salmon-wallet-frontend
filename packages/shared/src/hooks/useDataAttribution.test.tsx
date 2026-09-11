/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getNetworks = vi.fn();
vi.mock('../api/services/network', () => ({ getNetworks: () => getNetworks() }));

import { useDataAttribution } from './useDataAttribution';

const COINGECKO = { text: 'Data provided by CoinGecko', url: 'https://www.coingecko.com/en/api' };
const CATALOGUE = [
  { id: 'solana-mainnet', attribution: COINGECKO },
  { id: 'solana-devnet', attribution: null },
  { id: 'bitcoin-mainnet' },
];

describe('useDataAttribution', () => {
  beforeEach(() => {
    getNetworks.mockReset();
    getNetworks.mockResolvedValue(CATALOGUE);
  });

  it('returns the credit the catalogue publishes for the network', async () => {
    const { result } = renderHook(() => useDataAttribution('solana-mainnet'));

    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toEqual(COINGECKO));
  });

  it('returns null for a network that owes none, explicitly or by omission', async () => {
    const devnet = renderHook(() => useDataAttribution('solana-devnet'));
    const bitcoin = renderHook(() => useDataAttribution('bitcoin-mainnet'));
    const unknown = renderHook(() => useDataAttribution('ethereum-mainnet'));

    await waitFor(() => expect(getNetworks).toHaveBeenCalledTimes(3));
    expect(devnet.result.current).toBeNull();
    expect(bitcoin.result.current).toBeNull();
    expect(unknown.result.current).toBeNull();
  });

  it('does not read the catalogue without a network and stays null when it fails', async () => {
    const none = renderHook(() => useDataAttribution(null));
    expect(getNetworks).not.toHaveBeenCalled();
    expect(none.result.current).toBeNull();

    getNetworks.mockRejectedValue(new Error('offline'));
    const failed = renderHook(() => useDataAttribution('solana-mainnet'));
    await waitFor(() => expect(getNetworks).toHaveBeenCalledTimes(1));
    expect(failed.result.current).toBeNull();
  });

  it('drops the credit when the network changes to one that owes none', async () => {
    const { result, rerender } = renderHook((id: string) => useDataAttribution(id), {
      initialProps: 'solana-mainnet',
    });
    await waitFor(() => expect(result.current).toEqual(COINGECKO));

    rerender('solana-devnet');
    await waitFor(() => expect(result.current).toBeNull());
  });
});
