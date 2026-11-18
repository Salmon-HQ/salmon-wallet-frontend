import { describe, expect, it } from 'vitest';
import { AccountWithoutSolanaFeatures } from './AccountWithoutSolanaFeatures';
import { BitcoinAccount } from './bitcoin/BitcoinAccount';
import { EthereumAccount } from './ethereum/EthereumAccount';

class Plain extends AccountWithoutSolanaFeatures {}

describe('AccountWithoutSolanaFeatures', () => {
  const account = new Plain();

  it('rejects the Solana-only lookups with the string callers compare against', async () => {
    await expect(account.getDomain()).rejects.toBe('method_not_supported');
    await expect(account.getDomainFromPublicKey('x')).rejects.toBe('method_not_supported');
    await expect(account.getPublicKeyFromDomain('x.sol')).rejects.toBe('method_not_supported');
    await expect(account.getAvailableTokens()).rejects.toBe('method_not_supported');
    await expect(account.getFeaturedTokens()).rejects.toBe('method_not_supported');
  });

  it('answers null for NFTs and the transfer fee', async () => {
    await expect(account.getAllNfts()).resolves.toBeNull();
    await expect(account.calculateTransferFee('x', 1)).resolves.toBeNull();
  });

  it('is the base of the Bitcoin and Ethereum accounts, which add no override', () => {
    for (const cls of [BitcoinAccount, EthereumAccount]) {
      expect(cls.prototype).toBeInstanceOf(AccountWithoutSolanaFeatures);
      for (const method of ['getDomain', 'getAllNfts', 'calculateTransferFee']) {
        expect(Object.hasOwn(cls.prototype, method)).toBe(false);
      }
    }
  });
});
