import { describe, it, expect } from 'vitest';

import {
  toAccountSecret,
  toStoredSecret,
  buildSecretVault,
  getAccountMnemonic,
  seedVaultAccessToRelease,
} from './account-secret';
import type { Account, AccountSecret } from '../types/account';

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const PRIVATE_KEY_SECRET: AccountSecret = {
  kind: 'privateKey',
  privateKey: 'base58-key',
  networkId: 'solana-mainnet',
};

function makeAccount(id: string, secret: AccountSecret): Account {
  return {
    id,
    name: id,
    avatar: 'default',
    secret,
    pathIndexes: {},
    networksAccounts: {},
  };
}

describe('account secret vault serialization', () => {
  it('reads a legacy bare-string entry as a mnemonic', () => {
    // Every vault written before private-key import holds bare strings; they
    // must keep loading without a migration.
    expect(toAccountSecret(MNEMONIC)).toEqual({ kind: 'mnemonic', mnemonic: MNEMONIC });
  });

  it('reads a missing entry as an empty mnemonic rather than throwing', () => {
    expect(toAccountSecret(undefined)).toEqual({ kind: 'mnemonic', mnemonic: '' });
  });

  it('reads a private-key entry back unchanged', () => {
    expect(toAccountSecret(PRIVATE_KEY_SECRET)).toEqual(PRIVATE_KEY_SECRET);
  });

  it('keeps writing mnemonics as bare strings so existing vaults do not change shape', () => {
    expect(toStoredSecret({ kind: 'mnemonic', mnemonic: MNEMONIC })).toBe(MNEMONIC);
  });

  it('writes a private key as a tagged object', () => {
    expect(toStoredSecret(PRIVATE_KEY_SECRET)).toEqual(PRIVATE_KEY_SECRET);
  });

  it('round-trips a mixed vault', () => {
    const accounts = [
      makeAccount('a', { kind: 'mnemonic', mnemonic: MNEMONIC }),
      makeAccount('b', PRIVATE_KEY_SECRET),
    ];

    const vault = buildSecretVault(accounts);

    expect(vault).toEqual({ a: MNEMONIC, b: PRIVATE_KEY_SECRET });
    expect(toAccountSecret(vault.a)).toEqual(accounts[0].secret);
    expect(toAccountSecret(vault.b)).toEqual(accounts[1].secret);
  });

  it('reports no mnemonic for an imported account', () => {
    const imported = makeAccount('b', PRIVATE_KEY_SECRET);

    // Null, not '': backup surfaces must decide what to show instead of
    // rendering a blank seed phrase.
    expect(getAccountMnemonic(imported)).toBeNull();
  });

  it('reports the mnemonic for a seed account', () => {
    const seeded = makeAccount('a', { kind: 'mnemonic', mnemonic: MNEMONIC });

    expect(getAccountMnemonic(seeded)).toBe(MNEMONIC);
  });
});

describe('seedVaultAccessToRelease', () => {
  const sv = (id: string, authToken: string) =>
    ({
      id,
      secret: { kind: 'seedVault', authToken, derivationPath: 'p', address: id, networkId: 'n' },
    }) as never;

  it('gives up the access when the last wallet of a seed is removed', () => {
    expect(seedVaultAccessToRelease(sv('a', '7'), [sv('b', '8')])).toBe('7');
  });

  it('keeps it while another wallet of the same seed remains', () => {
    expect(seedVaultAccessToRelease(sv('a', '7'), [sv('b', '7')])).toBeNull();
  });

  it('has nothing to give up for a wallet that is not in Seed Vault', () => {
    expect(
      seedVaultAccessToRelease(
        { id: 'm', secret: { kind: 'mnemonic', mnemonic: 'x' } } as never,
        []
      )
    ).toBeNull();
  });
});
