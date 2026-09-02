/**
 * @vitest-environment jsdom
 *
 * The gap scan itself is covered in `utils/derived-accounts.test.ts`. What is
 * proven here is what spec 025 put on top of it: which paths are worth asking
 * about, that nothing is created until the user says so, and that a wallet is
 * never recorded as asked on a result nobody could trust.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

import { useDerivedAccountsScan } from './useDerivedAccountsScan';
import { useAccountsContext } from '../contexts/AccountsContext';
import { useUserConfig } from './useUserConfig';
import { createAccount } from '../factories/account-factory';
import {
  getScanNetworks,
  getScanNetworksWithMirrors,
  scanDerivedAccounts,
} from '../utils/derived-accounts';
import type { Account, AccountSecret } from '../types/account';
import type { BlockchainAccount } from '../types/blockchain';

vi.mock('../contexts/AccountsContext', () => ({ useAccountsContext: vi.fn() }));
vi.mock('./useUserConfig', () => ({ useUserConfig: vi.fn() }));
vi.mock('../factories/account-factory', () => ({ createAccount: vi.fn() }));
vi.mock('../utils/derived-accounts', () => ({
  getScanNetworks: vi.fn(),
  getScanNetworksWithMirrors: vi.fn(),
  scanDerivedAccounts: vi.fn(),
}));

const accountsMock = vi.mocked(useAccountsContext);
const configMock = vi.mocked(useUserConfig);
const scanMock = vi.mocked(scanDerivedAccounts);
const networksMock = vi.mocked(getScanNetworks);
const networksWithMirrorsMock = vi.mocked(getScanNetworksWithMirrors);
const createMock = vi.mocked(createAccount);

const MNEMONIC: AccountSecret = { kind: 'mnemonic', mnemonic: 'twelve words go here' };

const blockchainAccount = (address: string): BlockchainAccount =>
  ({ getReceiveAddress: () => address }) as unknown as BlockchainAccount;

function wallet(overrides: Partial<Account> = {}, addresses: string[] = ['sol-0']): Account {
  return {
    id: 'wallet-1',
    name: 'Account 1',
    avatar: 'default',
    secret: MNEMONIC,
    pathIndexes: {},
    networksAccounts: {
      'solana-mainnet': addresses.map(blockchainAccount),
    } as Account['networksAccounts'],
    ...overrides,
  };
}

/** One entry as `scanDerivedAccounts` reports it. */
const find = (index: number, address: string, balance: number) => ({
  account: blockchainAccount(address),
  address,
  path: `m/44/501/${index}`,
  index,
  networkId: 'solana-mainnet',
  networkName: 'Solana',
  balance,
  balanceFormatted: `${balance} SOL`,
  currencySymbol: 'SOL',
  selected: balance > 0,
});

const addAccount = vi.fn(async () => {});
const markDerivedScanned = vi.fn(async () => {});

function arrange({
  accounts,
  scanned = [] as string[],
  locked = false,
}: { accounts?: Account[]; scanned?: string[]; locked?: boolean } = {}) {
  const list = accounts ?? [wallet()];
  accountsMock.mockReturnValue([
    { accounts: list, activeAccount: list[0], locked, ready: true },
    { addAccount },
  ] as unknown as ReturnType<typeof useAccountsContext>);
  configMock.mockReturnValue({
    derivedScannedAccountIds: scanned,
    markDerivedScanned,
    isLoading: false,
  } as unknown as ReturnType<typeof useUserConfig>);
  return list[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  networksMock.mockResolvedValue(['solana-mainnet']);
  networksWithMirrorsMock.mockResolvedValue(['solana-mainnet', 'solana-devnet']);
  scanMock.mockResolvedValue({ accounts: [], failedNetworks: [] });
  createMock.mockImplementation(
    async ({ name, startIndex, derivedFrom }) =>
      ({
        account: { id: `new-${startIndex}`, name, derivedFrom },
      }) as unknown as Awaited<ReturnType<typeof createAccount>>
  );
});

describe('useDerivedAccountsScan', () => {
  it('asks about a funded path nobody holds yet', async () => {
    scanMock.mockResolvedValue({ accounts: [find(2, 'sol-2', 0.5)], failedNetworks: [] });
    arrange();

    const { result } = renderHook(() => useDerivedAccountsScan());

    await waitFor(() => expect(result.current.sheetVisible).toBe(true));
    expect(result.current.finds).toEqual([
      { index: 2, address: 'sol-2', balanceFormatted: '0.5 SOL' },
    ]);
    // Nothing is created and nothing is recorded until the user answers.
    expect(createMock).not.toHaveBeenCalled();
    expect(markDerivedScanned).not.toHaveBeenCalled();
  });

  it('leaves out a path the user already holds as a wallet', async () => {
    scanMock.mockResolvedValue({
      accounts: [find(2, 'sol-2', 0.5), find(3, 'sol-3', 1)],
      failedNetworks: [],
    });
    // A second wallet already owns the index-2 address — the "add account →
    // derive" path must never be offered back to the user.
    arrange({
      accounts: [wallet(), wallet({ id: 'wallet-2', derivedFrom: 'wallet-1' }, ['sol-2'])],
    });

    const { result } = renderHook(() => useDerivedAccountsScan());

    await waitFor(() => expect(result.current.sheetVisible).toBe(true));
    expect(result.current.finds.map(({ index }) => index)).toEqual([3]);
  });

  it('says nothing and marks the wallet scanned when it finds nothing', async () => {
    scanMock.mockResolvedValue({ accounts: [find(1, 'sol-1', 0)], failedNetworks: [] });
    arrange();

    const { result } = renderHook(() => useDerivedAccountsScan());

    await waitFor(() => expect(markDerivedScanned).toHaveBeenCalledWith('wallet-1'));
    expect(result.current.sheetVisible).toBe(false);
  });

  it('creates one wallet per chosen path, derived from the wallet it came out of', async () => {
    scanMock.mockResolvedValue({
      accounts: [find(2, 'sol-2', 0.5), find(4, 'sol-4', 2)],
      failedNetworks: [],
    });
    arrange();

    const { result } = renderHook(() => useDerivedAccountsScan());
    await waitFor(() => expect(result.current.sheetVisible).toBe(true));

    await act(async () => {
      await result.current.importFinds([2, 4]);
    });

    await waitFor(() => expect(addAccount).toHaveBeenCalledTimes(2));
    expect(createMock.mock.calls.map(([options]) => options.startIndex)).toEqual([2, 4]);
    for (const [options] of createMock.mock.calls) {
      expect(options.derivedFrom).toBe('wallet-1');
      expect(options.mnemonic).toBe('twelve words go here');
    }
    expect(markDerivedScanned).toHaveBeenCalledWith('wallet-1');
    expect(result.current.sheetVisible).toBe(false);
  });

  it('"Not now" records the answer and creates nothing', async () => {
    scanMock.mockResolvedValue({ accounts: [find(2, 'sol-2', 0.5)], failedNetworks: [] });
    arrange();

    const { result } = renderHook(() => useDerivedAccountsScan());
    await waitFor(() => expect(result.current.sheetVisible).toBe(true));

    await act(async () => {
      await result.current.dismiss();
    });

    expect(markDerivedScanned).toHaveBeenCalledWith('wallet-1');
    expect(createMock).not.toHaveBeenCalled();
    expect(result.current.sheetVisible).toBe(false);
  });

  it('never scans a wallet with no seed, and marks it so the check stays cheap', async () => {
    for (const secret of [
      { kind: 'privateKey', networkId: 'solana-mainnet', privateKey: 'k' },
      { kind: 'watchOnly', networkId: 'solana-mainnet', address: 'a' },
    ] as AccountSecret[]) {
      vi.clearAllMocks();
      arrange({ accounts: [wallet({ secret })] });

      renderHook(() => useDerivedAccountsScan());

      await waitFor(() => expect(markDerivedScanned).toHaveBeenCalledWith('wallet-1'));
      expect(scanMock).not.toHaveBeenCalled();
    }
  });

  it('skips a wallet already asked about', async () => {
    arrange({ scanned: ['wallet-1'] });

    renderHook(() => useDerivedAccountsScan());

    await act(async () => {});
    expect(scanMock).not.toHaveBeenCalled();
  });

  it('leaves the wallet unmarked when a network could not be scanned', async () => {
    scanMock.mockResolvedValue({ accounts: [], failedNetworks: ['solana-mainnet'] });
    arrange();

    const { result } = renderHook(() => useDerivedAccountsScan());

    await waitFor(() => expect(scanMock).toHaveBeenCalled());
    await act(async () => {});
    expect(markDerivedScanned).not.toHaveBeenCalled();
    expect(result.current.sheetVisible).toBe(false);
  });

  it('leaves the wallet unmarked when the scan throws', async () => {
    scanMock.mockRejectedValue(new Error('rpc down'));
    arrange();

    renderHook(() => useDerivedAccountsScan());

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

    const { rerender } = renderHook(() => useDerivedAccountsScan());
    await waitFor(() => expect(scanMock).toHaveBeenCalled());

    // The lock lands mid-scan. The token flips, the scan resolves into a
    // cancelled hook, and nothing is asked or recorded.
    arrange({ locked: true });
    rerender();
    await act(async () => {
      release?.();
    });

    expect(sawCancel).toBe(true);
    expect(markDerivedScanned).not.toHaveBeenCalled();
  });

  it('never scans a locked wallet at all', async () => {
    arrange({ locked: true });

    renderHook(() => useDerivedAccountsScan());

    await act(async () => {});
    expect(scanMock).not.toHaveBeenCalled();
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

    const { result } = renderHook(() => useDerivedAccountsScan());

    await waitFor(() => expect(result.current.scanningAccountId).toBe('wallet-1'));
    await act(async () => {
      await result.current.rescan('wallet-1');
    });
    expect(scanMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      release();
    });
    expect(result.current.scanningAccountId).toBeNull();
  });

  it('a rescan that finds nothing still answers — the sheet opens empty', async () => {
    arrange({ scanned: ['wallet-1'] });

    const { result } = renderHook(() => useDerivedAccountsScan());

    await act(async () => {
      await result.current.rescan('wallet-1');
    });

    expect(result.current.sheetVisible).toBe(true);
    expect(result.current.finds).toEqual([]);
  });
});
