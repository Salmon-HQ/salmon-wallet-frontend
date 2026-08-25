import { describe, it, expect } from 'vitest';

import {
  toAccountSecret,
  toStoredSecret,
  buildSecretVault,
  getAccountMnemonic,
  isImportedAccount,
  isWatchOnlyAccount,
} from './account-secret';
import { getActiveSolanaApprovalAccount } from './account';
import type { Account, AccountSecret } from '../types/account';
import type { BlockchainAccount } from '../types/blockchain';

const WATCHED_ADDRESS = '9xQeWvG816bUx9EPjHmaT23yvVMc2KLS8i4Qb9pQ6M7';
const SIGNABLE_ADDRESS = '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM';

const WATCH_ONLY_SECRET: AccountSecret = {
  kind: 'watchOnly',
  address: WATCHED_ADDRESS,
  networkId: 'solana-mainnet',
};

/**
 * Stand-ins shaped like the two account classes. `canSign` is the discriminator
 * the guards read, and `getRpc` is what makes both look like Solana accounts —
 * which is exactly why `canSign` has to exist.
 */
function makeBlockchainAccount(canSign: boolean, address: string): BlockchainAccount {
  return {
    canSign,
    getRpc: () => ({}),
    getReceiveAddress: () => address,
    getNetworkId: () => 'solana-mainnet',
    network: { networkId: 'solana-mainnet' },
    path: '',
  } as unknown as BlockchainAccount;
}

function makeAccount(id: string, secret: AccountSecret, accounts: BlockchainAccount[]): Account {
  return {
    id,
    name: id,
    avatar: 'default',
    secret,
    pathIndexes: { 'solana-mainnet': [0] },
    networksAccounts: { 'solana-mainnet': accounts },
  };
}

describe('watch-only accounts in the secret vault', () => {
  it('round-trips through the vault as watch-only', () => {
    // The load-bearing test for the whole feature. A watch-only account that
    // does not survive this comes back as something else entirely — see below.
    const account = makeAccount('a1', WATCH_ONLY_SECRET, []);
    const vault = buildSecretVault([account]);

    expect(vault.a1).toEqual(WATCH_ONLY_SECRET);
    expect(toAccountSecret(vault.a1)).toEqual(WATCH_ONLY_SECRET);
  });

  it('writes a tagged vault row rather than omitting one', () => {
    // Omitting the row is the tempting shortcut — there is no secret to store.
    // It is also the bug: a missing row reads back as a mnemonic, so the
    // account would be restored as a mnemonic account with an empty phrase and
    // would take the derivation branch on every unlock.
    expect(toStoredSecret(WATCH_ONLY_SECRET)).toEqual(WATCH_ONLY_SECRET);
    expect(toAccountSecret(undefined)).toEqual({ kind: 'mnemonic', mnemonic: '' });
    expect(toAccountSecret(undefined)).not.toEqual(WATCH_ONLY_SECRET);
  });

  it('leaves a legacy mnemonic vault byte-identical', () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon';
    const vault = buildSecretVault([makeAccount('m1', { kind: 'mnemonic', mnemonic }, [])]);
    expect(vault.m1).toBe(mnemonic);
  });

  it('has no mnemonic and is not an imported-key account', () => {
    const account = makeAccount('a1', WATCH_ONLY_SECRET, []);
    expect(getAccountMnemonic(account)).toBeNull();
    expect(isImportedAccount(account)).toBe(false);
    expect(isWatchOnlyAccount(account)).toBe(true);
  });
});

describe('getActiveSolanaApprovalAccount with a watch-only account', () => {
  it('refuses a watch-only active account', () => {
    const watcher = makeBlockchainAccount(false, WATCHED_ADDRESS);
    const account = makeAccount('a1', WATCH_ONLY_SECRET, [watcher]);

    expect(getActiveSolanaApprovalAccount(account, watcher)).toBeNull();
  });

  it('does not fall through to a different, signable account', () => {
    // The dangerous shape: the resolver's fallback walks past the active
    // account looking for any Solana account it can use. Answering a dApp with
    // a wallet the user did not select would be worse than refusing.
    const watcher = makeBlockchainAccount(false, WATCHED_ADDRESS);
    const signable = makeBlockchainAccount(true, SIGNABLE_ADDRESS);
    const account = makeAccount('a1', WATCH_ONLY_SECRET, [watcher, signable]);

    expect(getActiveSolanaApprovalAccount(account, watcher)).toBeNull();
  });

  it('still resolves a signable active account', () => {
    const signable = makeBlockchainAccount(true, SIGNABLE_ADDRESS);
    const account = makeAccount('a1', { kind: 'mnemonic', mnemonic: 'x' }, [signable]);

    expect(getActiveSolanaApprovalAccount(account, signable)).toBe(signable);
  });

  it('skips a watch-only entry when scanning an account for a signer', () => {
    // No active blockchain account: the resolver falls back to scanning, and
    // must not pick the watcher sitting at the preferred path index.
    const watcher = makeBlockchainAccount(false, WATCHED_ADDRESS);
    const signable = makeBlockchainAccount(true, SIGNABLE_ADDRESS);
    const account = makeAccount('a1', { kind: 'mnemonic', mnemonic: 'x' }, [watcher, signable]);

    expect(getActiveSolanaApprovalAccount(account, null)).toBe(signable);
  });
});
