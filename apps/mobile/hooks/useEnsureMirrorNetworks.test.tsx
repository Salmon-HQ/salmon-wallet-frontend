/**
 * A wallet made before mirrors were derived at creation holds only the mainnet
 * half. With Developer Networks on, the carousel would offer it a devnet page
 * it has no address for — and drop that page silently. The addresses are
 * completed on demand, from the seed already in memory, once per wallet.
 */
import { renderHook, waitFor } from '@testing-library/react-native';

const mockEnsureMirrorNetworks = jest.fn();
const mockEditAccount = jest.fn(async () => {});
const accountState = {
  ready: true,
  locked: false,
  activeAccount: null as Record<string, unknown> | null,
};

jest.mock('@salmon/shared', () => ({
  MIRROR_NETWORK_IDS: {
    'solana-mainnet': 'solana-devnet',
    'bitcoin-mainnet': 'bitcoin-testnet',
  },
  ensureMirrorNetworks: (...args: unknown[]) => mockEnsureMirrorNetworks(...args),
  useAccountsContext: () => [accountState, { editAccount: mockEditAccount }],
}));

import { useEnsureMirrorNetworks } from './useEnsureMirrorNetworks';

const walletHolding = (networksAccounts: Record<string, unknown[]>) => ({
  id: 'account-1',
  networksAccounts,
});

describe('useEnsureMirrorNetworks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    accountState.ready = true;
    accountState.locked = false;
    mockEnsureMirrorNetworks.mockResolvedValue([{ id: 'devnet-account' }]);
  });

  it('derives and persists the missing mirror once', async () => {
    accountState.activeAccount = walletHolding({ 'solana-mainnet': [{}] });

    const { rerender } = renderHook(() => useEnsureMirrorNetworks(true));

    await waitFor(() => expect(mockEditAccount).toHaveBeenCalledTimes(1));
    expect(mockEnsureMirrorNetworks).toHaveBeenCalledWith(accountState.activeAccount, [
      'solana-devnet',
    ]);
    expect(mockEditAccount).toHaveBeenCalledWith('account-1', {
      newDerivedAccounts: [{ id: 'devnet-account' }],
    });

    // A re-render is not a second derivation: the wallet is attempted once per
    // session, so a failure cannot loop on every render elsewhere in the app.
    rerender(undefined);
    expect(mockEnsureMirrorNetworks).toHaveBeenCalledTimes(1);
  });

  it('does nothing while the flag is off', () => {
    accountState.activeAccount = walletHolding({ 'solana-mainnet': [{}] });

    renderHook(() => useEnsureMirrorNetworks(false));

    expect(mockEnsureMirrorNetworks).not.toHaveBeenCalled();
  });

  it('does nothing while the wallet is locked — the seed is not in memory', () => {
    accountState.locked = true;
    accountState.activeAccount = walletHolding({ 'solana-mainnet': [{}] });

    renderHook(() => useEnsureMirrorNetworks(true));

    expect(mockEnsureMirrorNetworks).not.toHaveBeenCalled();
  });

  it('leaves a wallet that already holds every mirror alone', () => {
    accountState.activeAccount = walletHolding({
      'solana-mainnet': [{}],
      'solana-devnet': [{}],
    });

    renderHook(() => useEnsureMirrorNetworks(true));

    expect(mockEnsureMirrorNetworks).not.toHaveBeenCalled();
  });

  it('writes nothing when there is nothing to derive — watch-only and private-key wallets', async () => {
    // `ensureMirrorNetworks` returns empty for a wallet with no seed.
    mockEnsureMirrorNetworks.mockResolvedValue([]);
    accountState.activeAccount = walletHolding({ 'solana-mainnet': [{}] });

    renderHook(() => useEnsureMirrorNetworks(true));

    await waitFor(() => expect(mockEnsureMirrorNetworks).toHaveBeenCalled());
    expect(mockEditAccount).not.toHaveBeenCalled();
  });
});
