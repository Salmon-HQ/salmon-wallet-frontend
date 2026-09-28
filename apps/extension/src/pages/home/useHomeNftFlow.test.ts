/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const flowSpy = vi.fn((..._args: unknown[]) => ({}));
vi.mock('@salmon/shared', () => ({
  useAccountsContext: vi.fn(),
  useNftFlowState: (opts: unknown) => flowSpy(opts),
}));
vi.mock('@salmon/shared/utils/account', () => ({
  isSignableSolanaAccount: () => true,
}));

import { useHomeNftFlow } from './useHomeNftFlow';

const solanaAccount = (networkId: string) => ({ getNetworkId: () => networkId });

describe('useHomeNftFlow', () => {
  // The grid lists the active network's collectibles. Signing with the mainnet
  // account on devnet sent the burn and the transfer to a chain where the NFT
  // does not exist.
  it("signs with the active network's Solana account", () => {
    const devnet = solanaAccount('solana-devnet');
    const activeAccount = {
      id: 'wallet-1',
      networksAccounts: {
        'solana-mainnet': [solanaAccount('solana-mainnet')],
        'solana-devnet': [devnet],
      },
    } as never;

    renderHook(() =>
      useHomeNftFlow({ activeAccount, networkId: 'solana-devnet', navigate: vi.fn() })
    );

    expect(flowSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ account: devnet, networkId: 'solana-devnet' })
    );
  });
});
