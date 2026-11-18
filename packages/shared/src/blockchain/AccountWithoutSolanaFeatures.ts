/**
 * The part of the account surface that only Solana implements: name-service
 * domains, the token catalogues, NFTs and the Token-2022 transfer fee.
 *
 * A Bitcoin or Ethereum account answers these the same way, so the answers
 * live here once. The throwing methods reject with the string
 * `'method_not_supported'`, which is what callers compare against.
 */
export abstract class AccountWithoutSolanaFeatures {
  async getDomain(): Promise<never> {
    throw 'method_not_supported';
  }

  async getDomainFromPublicKey(_address: string): Promise<never> {
    throw 'method_not_supported';
  }

  async getPublicKeyFromDomain(_domain: string): Promise<never> {
    throw 'method_not_supported';
  }

  async getAllNfts(): Promise<null> {
    return null;
  }

  async getAvailableTokens(): Promise<never> {
    throw 'method_not_supported';
  }

  async getFeaturedTokens(): Promise<never> {
    throw 'method_not_supported';
  }

  /** The fee is computed when the transaction is built, so there is none to report here. */
  async calculateTransferFee(_tokenAddress?: string, _amount?: number): Promise<null> {
    return null;
  }
}
