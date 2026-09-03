/**
 * Transfer domain types.
 *
 * Contains types that cross module boundaries between blockchain
 * implementations and API/service layers.
 *
 * Note: Chain-specific transfer option/result types (Solana TransferOptions,
 * Ethereum GasEstimate, etc.) remain in their blockchain modules as they are
 * implementation-internal and have incompatible shapes.
 *
 * @module types/transfer
 */

// ============================================================================
// Bitcoin transfer types (used by api/services/bitcoin-transfer)
// ============================================================================

/**
 * Unspent Transaction Output (UTXO) from the API
 */
export interface UTXO {
  /** Transaction ID containing this UTXO */
  txid: string;
  /** Output index within the transaction */
  vout: number;
  /** Value in satoshis */
  satoshis: number;
  /** Raw transaction hex (for non-SegWit inputs) */
  rawTx?: string;
  /** Script pubkey hex */
  scriptPubKey?: string;
}

/**
 * Result of creating a transfer transaction
 */
export interface TransferTransactionResult {
  /** Transaction ID (hash) */
  txId: string;
  /** Serialized transaction hex for broadcasting */
  serializedTx: string;
}

/**
 * Result of broadcasting a transaction
 */
export interface BroadcastResult {
  /** Transaction ID if successful */
  txId?: string;
  /** Success indicator */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Bitcoin keypair with signing capability.
 * Extends BitcoinKeyPair with the BIP32 node for signing.
 */
export interface SigningKeyPair {
  /** P2PKH address (legacy format starting with 1 or m/n) */
  address: string;
  /** Private key in Wallet Import Format (WIF) */
  privateKeyWIF: string;
  /** Raw public key (33 bytes compressed) */
  publicKey: Uint8Array;
  /** BIP32 node for signing transactions */
  node: import('bip32').BIP32Interface;
}

// ============================================================================
// Dependency injection function signatures
// ============================================================================

export type FetchUtxosFn = (networkId: string, address: string) => Promise<UTXO[]>;

/**
 * Fetches a previous transaction's raw hex.
 *
 * A P2PKH input must carry the whole transaction it spends (`nonWitnessUtxo`),
 * and the UTXO listing does not include it — the backend's provider does not
 * expose raw hex on this plan. It is read from the same public relays the
 * signed transaction is broadcast to, so no part of a Bitcoin send depends on
 * our backend.
 */
export type FetchTransactionHexFn = (networkId: string, txid: string) => Promise<string>;

export type BroadcastTransactionFn = (
  networkId: string,
  address: string,
  serializedTx: string
) => Promise<{ txId?: string; success: boolean }>;

// ============================================================================
// Bitcoin account types (used by api/services/bitcoin-account, factories)
// ============================================================================

/**
 * Raw balance item from the Bitcoin API
 */
export interface BitcoinBalanceItem {
  /** Token/coin identifier */
  mint?: string;
  /** Balance amount in smallest unit */
  amount: number;
  /** Decimal places */
  decimals: number;
  /** Token symbol */
  symbol: string;
  /** Token name */
  name: string;
  /** Logo URL */
  logo?: string;
  /** UI-formatted amount */
  uiAmount?: number;
  /** CoinGecko ID for price lookup */
  coingeckoId?: string;
  /** Current price in USD */
  price?: number;
  /** USD balance value */
  usdBalance?: number;
  /** 24h price change percentage */
  priceChange24h?: number;
}

/**
 * Pagination parameters for transaction queries
 */
export interface TransactionPaging {
  /** Token for fetching next page */
  nextPageToken?: string;
  /** Number of items per page */
  pageSize?: number;
}

/**
 * Transaction input for account display
 */
export interface AccountTransactionInput {
  /** Previous transaction output address */
  address?: string;
  /** Amount in satoshis */
  value?: number;
  /** Previous transaction ID */
  txid?: string;
  /** Previous output index */
  vout?: number;
}

/**
 * Transaction output for account display
 */
export interface AccountTransactionOutput {
  /** Recipient address */
  address?: string;
  /** Amount in satoshis */
  value?: number;
  /** Output index */
  n?: number;
}

/**
 * Transaction details for display in account context.
 * This is a simplified view used by the UI layer.
 */
export interface AccountTransaction {
  /** Transaction ID (txid) */
  id: string;
  /** Transaction hash */
  hash?: string;
  /** Block height */
  blockHeight?: number;
  /** Confirmation count */
  confirmations?: number;
  /** Transaction timestamp */
  timestamp?: number;
  /** Transaction fee in satoshis */
  fee?: number;
  /** Transaction inputs */
  inputs?: AccountTransactionInput[];
  /** Transaction outputs */
  outputs?: AccountTransactionOutput[];
  /** Transaction amount (relative to account) */
  amount?: number;
  /** Transaction type (send/receive) */
  type?: 'send' | 'receive';
}

/**
 * Paginated transaction list response for account queries
 */
export interface AccountTransactionListResponse {
  /** List of transactions */
  items: AccountTransaction[];
  /** Token for next page (if more results exist) */
  nextPageToken?: string;
}

// ============================================================================
// Bitcoin account DI function signatures
// ============================================================================

export type FetchBitcoinBalanceFn = (
  networkId: string,
  address: string
) => Promise<BitcoinBalanceItem[]>;

export type FetchBitcoinRecentTransactionsFn = (
  networkId: string,
  address: string,
  paging?: TransactionPaging
) => Promise<AccountTransactionListResponse>;

/**
 * API dependencies required for BitcoinAccount operations
 */
export interface BitcoinAccountApiFunctions {
  fetchBalance: FetchBitcoinBalanceFn;
  fetchRecentTransactions: FetchBitcoinRecentTransactionsFn;
  fetchUtxos: FetchUtxosFn;
  fetchTransactionHex: FetchTransactionHexFn;
  broadcastTransaction: BroadcastTransactionFn;
}

// ============================================================================
// Ethereum account DI function signatures
// ============================================================================

export interface EthereumBalanceItem {
  mint?: string;
  amount: number;
  decimals: number;
  symbol: string;
  name: string;
  logo?: string;
  uiAmount?: number;
  coingeckoId?: string;
  price?: number;
  usdBalance?: number;
  priceChange24h?: number;
}

export type FetchEthereumBalanceFn = (
  networkId: import('./blockchain').EthereumNetworkId,
  address: string
) => Promise<EthereumBalanceItem[]>;

export type FetchEthereumRecentTransactionsFn = (
  networkId: import('./blockchain').EthereumNetworkId,
  address: string,
  paging?: TransactionPaging
) => Promise<AccountTransactionListResponse>;

/**
 * API dependencies required for EthereumAccount operations
 */
export interface EthereumAccountApiFunctions {
  fetchBalance: FetchEthereumBalanceFn;
  fetchRecentTransactions: FetchEthereumRecentTransactionsFn;
}

// ============================================================================
// Solana account DI function signatures
// ============================================================================

export interface SolanaBalanceItem {
  mint?: string;
  amount: number;
  decimals: number;
  symbol: string;
  name: string;
  logo?: string;
  uiAmount?: number;
  coingeckoId?: string;
  tags?: string[];
  price?: number;
  usdBalance?: number;
  priceChange24h?: number;
}

export interface FetchSolanaBalanceOpts {
  /** When `true`, asks the BE to skip the `unknown`-tagged token filter. */
  includeSpam?: boolean;
}

export type FetchSolanaBalanceFn = (
  networkId: import('./blockchain').SolanaNetworkId,
  address: string,
  opts?: FetchSolanaBalanceOpts
) => Promise<SolanaBalanceItem[]>;

export type FetchSolanaTransactionsFn = (
  networkId: import('./blockchain').SolanaNetworkId,
  address: string,
  paging?: import('./transaction').SolanaPagingParams
) => Promise<import('./transaction').SolanaTransactionsResponse>;

/**
 * API dependencies required for SolanaAccount operations
 */
export interface SolanaAccountApiFunctions {
  fetchBalance: FetchSolanaBalanceFn;
  fetchTransactions: FetchSolanaTransactionsFn;
  fetchNfts: import('./nft').FetchNftsFromBackendFn;
}
