import nacl from 'tweetnacl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Keypair } from '@solana/web3.js';
import type { SolanaAccount } from '../blockchain/solana';
import { signBytesWith } from '../blockchain/solana/signing';
import { registerSeedVault, type SeedVaultBridge } from '../blockchain/solana/seed-vault-signer';
import type { Account, AccountSecret } from '../types/account';
import { createBlockchainAccountForSeedVault, getAccountKeysForNetwork } from './account';

vi.mock('../hooks/useAvailableNetworks', () => ({
  fetchAndMergeNetworkConfigs: vi.fn().mockResolvedValue(true),
}));

// TEST-ONLY key standing in for the one Seed Vault holds; no funds.
const vaultKey = Keypair.fromSeed(new Uint8Array(32).fill(6));
const SECRET = {
  kind: 'seedVault',
  authToken: '4001',
  derivationPath: "m/44'/501'/0'/0'",
  address: vaultKey.publicKey.toBase58(),
  networkId: 'solana-mainnet',
} as const satisfies AccountSecret;

const fakeVault: SeedVaultBridge = {
  signTransactions: async (_a, _p, payloads) =>
    payloads.map((p) => nacl.sign.detached(p, vaultKey.secretKey)),
  signMessages: async (_a, _p, payloads) =>
    payloads.map((p) => nacl.sign.detached(p, vaultKey.secretKey)),
};

const bytes = new TextEncoder().encode('hello');

describe('Seed Vault account', () => {
  afterEach(() => registerSeedVault(null));

  it('has the Seed Vault address, signs through Seed Vault, and holds no key', async () => {
    registerSeedVault({ bridge: fakeVault, maxPerRequest: 3 });

    const account = (await createBlockchainAccountForSeedVault(SECRET)) as SolanaAccount;

    expect(account.getReceiveAddress()).toBe(SECRET.address);
    expect(() => account.retrieveSecurePrivateKey()).toThrow(/Seed Vault/);
    const signature = await signBytesWith(account.signer, bytes);
    expect(nacl.sign.detached.verify(bytes, signature, vaultKey.publicKey.toBytes())).toBe(true);
  });

  it('cannot sign where Seed Vault is not available', async () => {
    const account = (await createBlockchainAccountForSeedVault(SECRET)) as SolanaAccount;

    await expect(signBytesWith(account.signer, bytes)).rejects.toMatchObject({
      reason: 'unavailable',
    });
  });

  it('is left out of private-key export', async () => {
    const account = await createBlockchainAccountForSeedVault(SECRET);
    const wallet = {
      secret: SECRET,
      networksAccounts: { 'solana-mainnet': [account] },
    } as unknown as Account;

    expect(getAccountKeysForNetwork(wallet, 'solana-mainnet')).toEqual([]);
  });

  it('refuses a network that is not Solana', async () => {
    await expect(
      createBlockchainAccountForSeedVault({ ...SECRET, networkId: 'bitcoin-mainnet' })
    ).rejects.toThrow(/Seed Vault/);
  });
});
