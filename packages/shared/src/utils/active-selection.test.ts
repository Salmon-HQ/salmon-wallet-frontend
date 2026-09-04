/**
 * The pair a wallet can be read on.
 *
 * The failure these cover: a watch-only import holds one network
 * (`solana-mainnet`), while the session's network id and path index are
 * persisted and outlive whatever wallet chose them. Carrying that pair onto a
 * wallet that does not hold it leaves the session with no blockchain account —
 * and, because the pair is written back, leaves it that way after a relaunch.
 */

import { describe, expect, it } from 'vitest';

import { getHeldNetworkIds, getHeldPathIndex, resolveActiveSlot } from './active-selection';
import type { Account } from '../types/account';

/** A blockchain account is only ever read for truthiness here. */
const slot = (networkId: string) => ({ network: { id: networkId } }) as never;

function wallet(networksAccounts: Record<string, unknown[]>): Account {
  return {
    id: 'wallet-1',
    name: 'Wallet 1',
    avatar: 'a',
    secret: { kind: 'mnemonic', mnemonic: 'phrase' },
    pathIndexes: {},
    networksAccounts,
  } as unknown as Account;
}

const watchOnly = wallet({ 'solana-mainnet': [slot('solana-mainnet')] });

const multiChain = wallet({
  'solana-mainnet': [slot('solana-mainnet')],
  'solana-devnet': [slot('solana-devnet')],
  'bitcoin-mainnet': [slot('bitcoin-mainnet')],
});

describe('getHeldNetworkIds', () => {
  it('reports only the networks with a filled slot', () => {
    const account = wallet({
      'solana-mainnet': [slot('solana-mainnet')],
      // A derivation that produced nothing leaves the key with empty slots.
      'bitcoin-mainnet': [null, null],
    });

    expect(getHeldNetworkIds(account)).toEqual(['solana-mainnet']);
  });

  it('reports nothing for the pre-unlock placeholder', () => {
    expect(getHeldNetworkIds(wallet({}))).toEqual([]);
    expect(getHeldNetworkIds(undefined)).toEqual([]);
  });
});

describe('getHeldPathIndex', () => {
  it('keeps the preferred index when that slot is filled', () => {
    const account = wallet({ 'solana-mainnet': [null, null, slot('solana-mainnet')] });

    expect(getHeldPathIndex(account, 'solana-mainnet', 2)).toBe(2);
  });

  it('falls back to the first filled slot', () => {
    const account = wallet({ 'solana-mainnet': [null, slot('solana-mainnet')] });

    expect(getHeldPathIndex(account, 'solana-mainnet', 5)).toBe(1);
  });

  it('returns null — never -1 — for an all-empty network', () => {
    expect(getHeldPathIndex(wallet({ 'solana-mainnet': [null] }), 'solana-mainnet')).toBeNull();
    expect(getHeldPathIndex(watchOnly, 'bitcoin-mainnet')).toBeNull();
  });
});

describe('resolveActiveSlot', () => {
  it('keeps the requested pair when the wallet holds it', () => {
    expect(resolveActiveSlot(multiChain, { networkId: 'bitcoin-mainnet', pathIndex: 0 })).toEqual({
      networkId: 'bitcoin-mainnet',
      pathIndex: 0,
    });
  });

  it('moves a watch-only wallet off a network it does not hold', () => {
    // The reported bug: the watcher was added while the session was reading
    // the Bitcoin page, and the pair was persisted as-is.
    expect(resolveActiveSlot(watchOnly, { networkId: 'bitcoin-mainnet', pathIndex: 0 })).toEqual({
      networkId: 'solana-mainnet',
      pathIndex: 0,
    });
  });

  it('stays on the requested chain, mainnet first, when it can', () => {
    const solanaOnly = wallet({
      'solana-devnet': [slot('solana-devnet')],
      'solana-mainnet': [slot('solana-mainnet')],
      'bitcoin-mainnet': [slot('bitcoin-mainnet')],
    });

    expect(resolveActiveSlot(solanaOnly, { networkId: 'solana-testnet', pathIndex: 0 })).toEqual({
      networkId: 'solana-mainnet',
      pathIndex: 0,
    });
  });

  it('drops the path index when the network changes', () => {
    const account = wallet({
      'solana-mainnet': [slot('solana-mainnet')],
      'bitcoin-mainnet': [null, null, slot('bitcoin-mainnet')],
    });

    expect(resolveActiveSlot(account, { networkId: 'bitcoin-mainnet', pathIndex: 2 })).toEqual({
      networkId: 'bitcoin-mainnet',
      pathIndex: 2,
    });
    // Index 2 says nothing about Solana, which holds only index 0.
    expect(resolveActiveSlot(account, { networkId: 'solana-mainnet', pathIndex: 2 })).toEqual({
      networkId: 'solana-mainnet',
      pathIndex: 0,
    });
  });

  it('falls back to a held mainnet when nothing was requested', () => {
    const bitcoinOnly = wallet({ 'bitcoin-mainnet': [slot('bitcoin-mainnet')] });

    expect(resolveActiveSlot(bitcoinOnly, {})).toEqual({
      networkId: 'bitcoin-mainnet',
      pathIndex: 0,
    });
  });

  it('resolves nothing for a wallet with no accounts in memory', () => {
    expect(resolveActiveSlot(wallet({}), { networkId: 'solana-mainnet', pathIndex: 0 })).toBeNull();
    expect(resolveActiveSlot(undefined, { networkId: 'solana-mainnet', pathIndex: 0 })).toBeNull();
  });
});
