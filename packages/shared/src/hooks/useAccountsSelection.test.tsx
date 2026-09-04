/**
 * @vitest-environment jsdom
 *
 * The session heals a selection the active wallet cannot answer for.
 *
 * A wallet already left on a network it does not hold — a watch-only import
 * added while the session was reading another chain — has that pair in storage,
 * so it survives every relaunch. Reading through the resolved pair, and writing
 * the correction back, is what lets such a session come back on its own instead
 * of needing a reinstall.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();

vi.mock('../storage', () => ({
  setStorageItem: async (key: string, value: unknown) => {
    store.set(key, value);
  },
  STORAGE_KEYS: {
    ACCOUNT_ID: 'account_id',
    NETWORK_ID: 'network_id',
    PATH_INDEX: 'path_index',
  },
}));

vi.mock('../analytics', () => ({ trackEvent: vi.fn() }));

import { useAccountsSelection } from './useAccountsSelection';
import type { Account } from '../types/account';

/** A blockchain account is only ever read for truthiness / identity here. */
const slot = (label: string) => ({ label }) as never;

function wallet(id: string, networksAccounts: Record<string, unknown[]>): Account {
  return {
    id,
    name: id,
    avatar: 'a',
    secret: { kind: 'mnemonic', mnemonic: 'phrase' },
    pathIndexes: {},
    networksAccounts,
  } as unknown as Account;
}

const seeded = wallet('seeded', {
  'solana-mainnet': [slot('seeded:solana')],
  'bitcoin-mainnet': [slot('seeded:bitcoin')],
});

/** What "add watch-only" produces: one address, one network. */
const watcher = wallet('watcher', { 'solana-mainnet': [slot('watcher:solana')] });

/**
 * Drives the hook with the session state it owns, the way `useAccounts` does —
 * the setters write back into the state the next render reads, so a correction
 * the hook makes is visible to the assertions.
 */
function renderSelection(initial: {
  accounts: Account[];
  accountId: string | null;
  networkId: string | null;
  pathIndex: number;
}) {
  const session = { ...initial };

  const view = renderHook(() =>
    useAccountsSelection({
      accounts: session.accounts,
      accountId: session.accountId,
      setAccountId: ((value: string) => {
        session.accountId = value;
      }) as never,
      networkId: session.networkId,
      setNetworkId: ((value: string) => {
        session.networkId = value;
      }) as never,
      pathIndex: session.pathIndex,
      setPathIndex: ((value: number) => {
        session.pathIndex = value;
      }) as never,
      setSwitchingNetwork: (() => undefined) as never,
    })
  );

  return { ...view, session };
}

beforeEach(() => {
  store.clear();
});

describe('useAccountsSelection — healing a stale selection', () => {
  it('reads the wallet on a network it holds, not the one the session carries', () => {
    const { result } = renderSelection({
      accounts: [watcher],
      accountId: 'watcher',
      networkId: 'bitcoin-mainnet',
      pathIndex: 0,
    });

    // Before the fix this was undefined — the screen's "No account found".
    expect(result.current.activeBlockchainAccount).toBe(
      watcher.networksAccounts['solana-mainnet'][0]
    );
  });

  it('persists the correction so the next launch is already right', async () => {
    const { session } = renderSelection({
      accounts: [watcher],
      accountId: 'watcher',
      networkId: 'bitcoin-mainnet',
      pathIndex: 0,
    });

    await waitFor(() => expect(store.get('network_id')).toBe('solana-mainnet'));
    expect(store.get('path_index')).toBe(0);
    expect(session.networkId).toBe('solana-mainnet');
  });

  it('leaves a selection the wallet does hold alone', async () => {
    const { result } = renderSelection({
      accounts: [seeded],
      accountId: 'seeded',
      networkId: 'bitcoin-mainnet',
      pathIndex: 0,
    });

    expect(result.current.activeBlockchainAccount).toBe(
      seeded.networksAccounts['bitcoin-mainnet'][0]
    );
    await Promise.resolve();
    expect(store.has('network_id')).toBe(false);
  });

  it('writes nothing while the wallet is still a pre-unlock placeholder', async () => {
    const placeholder = wallet('locked', {});

    const { result } = renderSelection({
      accounts: [placeholder],
      accountId: 'locked',
      networkId: 'solana-mainnet',
      pathIndex: 0,
    });

    expect(result.current.activeBlockchainAccount).toBeUndefined();
    await Promise.resolve();
    expect(store.size).toBe(0);
  });
});

describe('useAccountsSelection — switching wallets', () => {
  it('moves network and slot together, and persists what it moved to', async () => {
    const { result, session } = renderSelection({
      accounts: [seeded, watcher],
      accountId: 'seeded',
      networkId: 'bitcoin-mainnet',
      pathIndex: 0,
    });

    await act(async () => {
      await result.current.changeAccount('watcher');
    });

    expect(store.get('account_id')).toBe('watcher');
    // The old bug wrote a hardcoded 0 for the index and left the network
    // untouched, so storage and runtime disagreed until the next launch.
    expect(store.get('network_id')).toBe('solana-mainnet');
    expect(store.get('path_index')).toBe(0);
    expect(session.networkId).toBe('solana-mainnet');
  });

  it('keeps the session network when the wallet being switched to holds it', async () => {
    const otherSeeded = wallet('seeded-2', {
      'solana-mainnet': [slot('seeded2:solana')],
      'bitcoin-mainnet': [slot('seeded2:bitcoin')],
    });

    const { result } = renderSelection({
      accounts: [seeded, otherSeeded],
      accountId: 'seeded',
      networkId: 'bitcoin-mainnet',
      pathIndex: 0,
    });

    await act(async () => {
      await result.current.changeAccount('seeded-2');
    });

    expect(store.get('network_id')).toBe('bitcoin-mainnet');
  });
});

describe('useAccountsSelection — guards', () => {
  it('refuses a network the wallet does not hold', async () => {
    const { result, session } = renderSelection({
      accounts: [watcher],
      accountId: 'watcher',
      networkId: 'solana-mainnet',
      pathIndex: 0,
    });

    await act(async () => {
      await result.current.changeNetwork('bitcoin-mainnet');
    });

    expect(session.networkId).toBe('solana-mainnet');
    expect(store.has('network_id')).toBe(false);
  });

  it('refuses an in-range but empty slot', async () => {
    const gapped = wallet('gapped', { 'solana-mainnet': [slot('gapped:0'), null] });

    const { result, session } = renderSelection({
      accounts: [gapped],
      accountId: 'gapped',
      networkId: 'solana-mainnet',
      pathIndex: 0,
    });

    await act(async () => {
      await result.current.changePathIndex(1);
    });

    expect(session.pathIndex).toBe(0);
    expect(store.has('path_index')).toBe(false);
  });
});
