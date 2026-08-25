import type { Address } from '@solana/kit';
import type { SolanaNetwork } from '../../types/blockchain';
import type { FetchSolanaBalanceFn, FetchSolanaTransactionsFn } from '../../types/transfer';
import type { FetchNftsFromBackendFn } from '../../types/nft';
import { SolanaReadAccount } from './SolanaReadAccount';

/**
 * Options for creating a watch-only Solana account.
 *
 * There is no `keyPair` and no `index`/`path` to derive from — a watch-only
 * account is an address the user asked the wallet to follow, nothing more.
 */
export interface WatchOnlySolanaAccountOptions {
  /** Network configuration */
  network: SolanaNetwork;
  /** The address being watched */
  publicKey: Address;
  /** Function to fetch token balances (DI) */
  fetchBalance: FetchSolanaBalanceFn;
  /** Function to fetch transactions list (DI) */
  fetchTransactions: FetchSolanaTransactionsFn;
  /** Function to fetch NFTs from backend (DI) */
  fetchNfts: FetchNftsFromBackendFn;
}

/**
 * A Solana address the wallet follows without holding its key.
 *
 * It reads exactly like any other account — balances, tokens, NFTs, activity,
 * domains — and it cannot sign, because there is nothing here to sign with.
 * That is enforced by the type, not by a check: this class has no `signer`,
 * no `seed`, no `transfer`, and no `retrieveSecurePrivateKey`, so handing one
 * to a signing path is a compile error.
 *
 * `index` and `path` are fixed at 0 and the empty string. They exist because
 * the account model carries them for every account, not because anything was
 * derived — a watch-only account has no derivation.
 */
export class WatchOnlySolanaAccount extends SolanaReadAccount {
  /** This account holds no key material and can never sign. */
  override readonly canSign = false as const;

  constructor(options: WatchOnlySolanaAccountOptions) {
    super({
      network: options.network,
      index: 0,
      path: '',
      publicKey: options.publicKey,
      fetchBalance: options.fetchBalance,
      fetchTransactions: options.fetchTransactions,
      fetchNfts: options.fetchNfts,
    });
  }
}
