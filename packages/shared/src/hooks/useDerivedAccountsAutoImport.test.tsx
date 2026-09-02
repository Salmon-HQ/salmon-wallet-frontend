/**
 * @vitest-environment jsdom
 *
 * The gap scan itself is covered in `utils/derived-accounts.test.ts`. What is
 * proven here is the part that replaced a screen the user could decline: which
 * wallet gets scanned, what counts as a finished scan, and that a wallet is
 * never marked done on a result nobody could trust.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

import { useDerivedAccountsAutoImport } from './useDerivedAccountsAutoImport';
import { useAccountsContext } from '../contexts/AccountsContext';
import { useUserConfig } from './useUserConfig';
import { deriveBlockchainAccount } from '../factories/account-factory';
import { getScanNetworks, scanDerivedAccounts } from '../utils/derived-accounts';
import type { Account, AccountSecret, EditAccountParams } from '../types/account';
import type { BlockchainAccount } from '../types/blockchain';

vi.mock('../contexts/AccountsContext', () => ({ useAccountsContext: vi.fn() }));
vi.mock('./useUserConfig', () => ({ useUserConfig: vi.fn() }));
vi.mock('../factories/account-factory', () => ({ deriveBlockchainAccount: vi.fn() }));
vi.mock('../utils/derived-accounts', () => ({
  getScanNetworks: vi.fn(),
  getMirrorNetworks: vi.fn(),
  getMirrorNetworkId: vi.fn(async (id: string) =>
    id === 'solana-mainnet' ? 'solana-devnet' : undefined
  ),
  scanDerivedAccounts: vi.fn(),
}));

const accountsMock = vi.mocked(useAccountsContext);
const configMock = vi.mocked(useUserConfig);
const scanMock = vi.mocked(scanDerivedAccounts);
const networksMock = vi.mocked(getScanNetworks);
const deriveMock = vi.mocked(deriveBlockchainAccount);

const MNEMONIC: AccountSecret = { kind: 'mnemonic', mnemonic: 'twelve words go here' };

const blockchainAccount = (networkId: string, index: number): BlockchainAccount =>
  ({
    network: { id: networkId },
    index,
    getReceiveAddress: () => `${networkId}-${index}`,
  }) as unknown as BlockchainAccount;

function wallet(
  overrides: Partial<Account> = {},
  networks: string[] = ['solana-mainnet']
): Account {
  return {
    id: 'wallet-1',
    name: 'Account 1',
    avatar: 'default',
    secret: MNEMONIC,
    pathIndexes: {},
    networksAccounts: Object.fromEntries(
      networks.map((id) => [id, [blockchainAccount(id, 0)]])
    ) as Account['networksAccounts'],
    ...overrides,
  };
}

const editAccount = vi.fn(async (_targetId: string, _params: EditAccountParams) => {});
const markDerivedScanned = vi.fn(async () => {});

function arrange({
  account = wallet(),
  scanned = [] as string[],
  locked = false,
}: { account?: Account; scanned?: string[]; locked?: boolean } = {}) {
  accountsMock.mockReturnValue([
    { accounts: [account], activeAccount: account, locked, ready: true },
    { editAccount },
  ] as unknown as ReturnType<typeof useAccountsContext>);
  configMock.mockReturnValue({
    derivedScannedAccountIds: scanned,
    markDerivedScanned,
    isLoading: false,
  } as unknown as ReturnType<typeof useUserConfig>);
  return account;
}

beforeEach(() => {
  vi.clearAllMocks();
  networksMock.mockResolvedValue(['solana-mainnet']);
  scanMock.mockResolvedValue({ accounts: [], failedNetworks: [] });
  deriveMock.mockImplementation(async (_mnemonic, networkId, index) =>
    blockchainAccount(networkId, index)
  );
});

describe('useDerivedAccountsAutoImport', () => {
  it('scans an unmarked mnemonic wallet and records it as done', async () => {
    scanMock.mockResolvedValue({
      accounts: [
        {
          account: blockchainAccount('solana-mainnet', 1),
          networkId: 'solana-mainnet',
          index: 1,
          balance: 0.5,
        },
      ] as never,
      failedNetworks: [],
    });
    arrange();

    renderHook(() => useDerivedAccountsAutoImport());

    await waitFor(() => expect(markDerivedScanned).toHaveBeenCalledWith('wallet-1'));
    expect(editAccount).toHaveBeenCalledWith('wallet-1', {
      newDerivedAccounts: [expect.anything()],
    });
  });

  it('skips a wallet already marked scanned', async () => {
    arrange({ scanned: ['wallet-1'] });

    renderHook(() => useDerivedAccountsAutoImport());

    await act(async () => {});
    expect(scanMock).not.toHaveBeenCalled();
  });

  it('never scans a wallet that has no seed, and marks it so the check stays cheap', async () => {
    for (const secret of [
      { kind: 'privateKey', networkId: 'solana-mainnet', privateKey: 'k' },
      { kind: 'watchOnly', networkId: 'solana-mainnet', address: 'a' },
    ] as AccountSecret[]) {
      vi.clearAllMocks();
      arrange({ account: wallet({ secret }) });

      renderHook(() => useDerivedAccountsAutoImport());

      await waitFor(() => expect(markDerivedScanned).toHaveBeenCalledWith('wallet-1'));
      expect(scanMock).not.toHaveBeenCalled();
    }
  });

  it('leaves the wallet unmarked when a network could not be scanned', async () => {
    scanMock.mockResolvedValue({ accounts: [], failedNetworks: ['solana-mainnet'] });
    arrange();

    renderHook(() => useDerivedAccountsAutoImport());

    await waitFor(() => expect(scanMock).toHaveBeenCalled());
    await act(async () => {});
    expect(markDerivedScanned).not.toHaveBeenCalled();
    expect(editAccount).not.toHaveBeenCalled();
  });

  it('leaves the wallet unmarked when the scan throws', async () => {
    scanMock.mockRejectedValue(new Error('rpc down'));
    arrange();

    renderHook(() => useDerivedAccountsAutoImport());

    await waitFor(() => expect(scanMock).toHaveBeenCalled());
    await act(async () => {});
    expect(markDerivedScanned).not.toHaveBeenCalled();
  });

  it('cancels on lock and leaves the wallet unmarked', async () => {
    let release: (() => void) | null = null;
    let sawCancel = false;
    scanMock.mockImplementation(
      (_m, _n, _b, isCancelled) =>
        new Promise((resolve) => {
          release = () => {
            sawCancel = (isCancelled as () => boolean)();
            resolve({ accounts: [], failedNetworks: [] });
          };
        })
    );
    arrange();

    const { rerender } = renderHook(() => useDerivedAccountsAutoImport());
    await waitFor(() => expect(scanMock).toHaveBeenCalled());

    // The lock lands mid-scan. The token flips, the scan resolves into a
    // cancelled hook, and nothing is imported or recorded.
    arrange({ locked: true });
    rerender();
    await act(async () => {
      release?.();
    });

    expect(sawCancel).toBe(true);
    expect(editAccount).not.toHaveBeenCalled();
    expect(markDerivedScanned).not.toHaveBeenCalled();
  });

  it('never scans a locked wallet at all', async () => {
    arrange({ locked: true });

    renderHook(() => useDerivedAccountsAutoImport());

    await act(async () => {});
    expect(scanMock).not.toHaveBeenCalled();
  });

  it('imports the mirror account only for a wallet that holds the mirror network', async () => {
    scanMock.mockResolvedValue({
      accounts: [
        {
          account: blockchainAccount('solana-mainnet', 1),
          networkId: 'solana-mainnet',
          index: 1,
          balance: 0.5,
        },
      ] as never,
      failedNetworks: [],
    });

    arrange({ account: wallet({}, ['solana-mainnet']) });
    renderHook(() => useDerivedAccountsAutoImport());
    await waitFor(() => expect(editAccount).toHaveBeenCalled());
    expect(editAccount.mock.calls[0][1].newDerivedAccounts).toHaveLength(1);

    vi.clearAllMocks();
    scanMock.mockResolvedValue({
      accounts: [
        {
          account: blockchainAccount('solana-mainnet', 1),
          networkId: 'solana-mainnet',
          index: 1,
          balance: 0.5,
        },
      ] as never,
      failedNetworks: [],
    });
    deriveMock.mockImplementation(async (_mnemonic, networkId, index) =>
      blockchainAccount(networkId, index)
    );
    arrange({ account: wallet({}, ['solana-mainnet', 'solana-devnet']) });
    renderHook(() => useDerivedAccountsAutoImport());
    await waitFor(() => expect(editAccount).toHaveBeenCalled());
    expect(editAccount.mock.calls[0][1].newDerivedAccounts).toHaveLength(2);
  });

  it('imports only funded paths — an empty index 1 is a path nobody uses', () => {
    // The scan always reports index 1 so the add-account panel can offer it as
    // a new account to create by hand; importing it would hand every recovered
    // wallet a row that means nothing (owner, 2026-09-02).
    scanMock.mockResolvedValue({
      accounts: [
        {
          account: blockchainAccount('solana-mainnet', 1),
          networkId: 'solana-mainnet',
          index: 1,
          balance: 0,
        },
      ] as never,
      failedNetworks: [],
    });
    arrange();

    renderHook(() => useDerivedAccountsAutoImport());

    return waitFor(() => expect(markDerivedScanned).toHaveBeenCalledWith('wallet-1')).then(() => {
      expect(editAccount).not.toHaveBeenCalled();
    });
  });

  it('runs one scan at a time — a rescan mid-scan does not start a second one', async () => {
    let release: () => void = () => {};
    scanMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ accounts: [], failedNetworks: [] });
        })
    );
    arrange();

    const { result } = renderHook(() => useDerivedAccountsAutoImport());

    await waitFor(() => expect(result.current.status.scanningAccountId).toBe('wallet-1'));
    await act(async () => {
      await result.current.rescan('wallet-1');
    });
    expect(scanMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      release();
    });
    expect(result.current.status.scanningAccountId).toBeNull();
  });
});
