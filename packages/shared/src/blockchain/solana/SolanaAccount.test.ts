import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createKeyPairSignerFromPrivateKeyBytes } from '@solana/kit';

vi.mock('./domains', () => ({
  getDomain: vi.fn(),
  getDomainFromPublicKey: vi.fn(),
  getPublicKeyFromDomain: vi.fn(),
}));

import { SOLANA_NETWORKS } from './networks';
import { SolanaAccount } from './SolanaAccount';
import {
  getDomain,
  getDomainFromPublicKey,
  getPublicKeyFromDomain,
} from './domains';

const mockGetDomain = vi.mocked(getDomain);
const mockGetDomainFromPublicKey = vi.mocked(getDomainFromPublicKey);
const mockGetPublicKeyFromDomain = vi.mocked(getPublicKeyFromDomain);

/** A fixed address that is not the one under test. */
const OTHER_ADDRESS = 'AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9';

async function createAccount(seed: Uint8Array = crypto.getRandomValues(new Uint8Array(32))) {
  return new SolanaAccount({
    network: SOLANA_NETWORKS['solana-mainnet'],
    index: 0,
    path: "m/44'/501'/0'/0'",
    keyPair: { seed, signer: await createKeyPairSignerFromPrivateKeyBytes(seed, false) },
    fetchBalance: vi.fn(),
    fetchTransactions: vi.fn(),
    fetchNfts: vi.fn(),
  });
}

describe('SolanaAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('caches the kit rpc client per node url and derives the subscriptions endpoint', async () => {
    const account = await createAccount();
    const network = SOLANA_NETWORKS['solana-mainnet'];
    const originalNodeUrl = network.config.nodeUrl;

    const rpc = account.getRpc();
    const derived = account.getRpcSubscriptions();
    expect(account.getRpc()).toBe(rpc);
    expect(account.getRpcSubscriptions()).toBe(derived);

    network.config.nodeUrl = 'https://new-rpc.example';
    const rebuilt = account.getRpc();
    expect(rebuilt).not.toBe(rpc);

    // A same-host wsUrl from the backend wins over the derivation.
    network.config.wsUrl = 'wss://new-rpc.example/ws';
    expect(account.getRpcSubscriptions()).not.toBe(derived);

    // disconnect() drops every cached client, not just the connection.
    await account.disconnect();
    expect(account.getRpc()).not.toBe(rebuilt);

    delete network.config.wsUrl;
    network.config.nodeUrl = originalNodeUrl;
  });

  it('reads the balance through the kit rpc at the configured commitment', async () => {
    const account = await createAccount();
    const getBalance = vi.fn().mockReturnValue({ send: async () => ({ value: 1234n }) });
    vi.spyOn(account, 'getRpc').mockReturnValue({ getBalance } as never);

    await expect(account.getCredit()).resolves.toBe(1234);
    // Without the explicit commitment the RPC server would default to
    // 'finalized' and return a staler balance than the legacy Connection did.
    expect(getBalance).toHaveBeenCalledWith(account.publicKey, { commitment: 'confirmed' });
  });

  it('wraps domain helper methods with the account rpc', async () => {
    const account = await createAccount();
    mockGetDomain.mockResolvedValueOnce('wallet.sol');
    mockGetDomainFromPublicKey.mockResolvedValueOnce('friend.sol');
    mockGetPublicKeyFromDomain.mockResolvedValueOnce('resolved-public-key');

    const rpc = account.getRpc();

    await expect(account.getDomain()).resolves.toBe('wallet.sol');
    await expect(account.getDomainFromPublicKey(OTHER_ADDRESS)).resolves.toBe('friend.sol');
    await expect(account.getPublicKeyFromDomain('friend.sol')).resolves.toBe('resolved-public-key');

    // `rpc` is a kit Proxy client with no own enumerable properties, so
    // vitest's deep-equal in `toHaveBeenCalledWith` can't compare it
    // structurally. Assert it by reference and the rest of the args by value.
    expect(mockGetDomain).toHaveBeenCalledWith(expect.anything(), account.publicKey);
    expect(mockGetDomain.mock.calls[0][0]).toBe(rpc);

    expect(mockGetDomainFromPublicKey).toHaveBeenCalledWith(expect.anything(), OTHER_ADDRESS);
    expect(mockGetDomainFromPublicKey.mock.calls[0][0]).toBe(rpc);

    expect(mockGetPublicKeyFromDomain).toHaveBeenCalledWith(expect.anything(), 'friend.sol');
    expect(mockGetPublicKeyFromDomain.mock.calls[0][0]).toBe(rpc);
  });

  it('returns base58 secret key and validates public key helpers', async () => {
    const account = await createAccount();

    expect(typeof account.retrieveSecurePrivateKey()).toBe('string');
    expect(account.retrieveSecurePrivateKey().length).toBeGreaterThan(0);
    expect(SolanaAccount.isValidAddress(account.getReceiveAddress())).toBe(true);
    expect(SolanaAccount.isValidAddress('not-a-solana-address')).toBe(false);
  });

  it('rebuilds the same key material from the seed as the legacy keypair did', async () => {
    // seed = 0x01 * 32 — a fixed vector, so a change in how the account turns
    // signing key material into a keypair is caught here rather than in the field.
    const account = await createAccount(new Uint8Array(32).fill(1));

    expect(account.retrieveSecurePrivateKey()).toBe(
      '2AXDGYSE4f2sz7tvMMzyHvUfcoJmxudvdhBcmiUSo6iuCXagjUCKEQF21awZnUGxmwD4m9vGXuC3qieHXJQHAcT'
    );
    expect(account.signer.address).toBe('AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9');
    expect(account.publicKey).toBe(account.signer.address);
    expect(account.getReceiveAddress()).toBe(account.signer.address);
  });

  it('throws exact method_not_supported errors for deprecated swap/token methods', async () => {
    const account = await createAccount();

    await expect(account.getAvailableTokens()).rejects.toThrow(
      'method_not_supported: Use token list service directly'
    );
    await expect(account.getFeaturedTokens()).rejects.toThrow(
      'method_not_supported: Use token list service directly'
    );
    await expect(account.getBestSwapQuote()).rejects.toThrow(
      'method_not_supported: Use swap service directly'
    );
    await expect(account.createSwapTransaction()).rejects.toThrow(
      'method_not_supported: Use swap service directly'
    );
  });
});
