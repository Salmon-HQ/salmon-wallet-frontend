import {
  Connection,
  PublicKey,
  Commitment,
  Message,
} from '@solana/web3.js';
import { address, createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import type { KeyPairSigner } from '@solana/kit';
import bs58 from 'bs58';
import {
  SOLANA_NETWORKS,
  resolveSolanaWsUrl,
  type SolanaRpc,
  type SolanaRpcSubscriptions,
} from './networks';
import {
  requiresMemo as checkRequiresMemo,
  calculateTransferFee as calcTransferFee,
  createTransfer,
  estimateFee as estimateSolanaFee,
  type TransferOptions as SolanaTransferOptions,
  type EstimateFeeOptions,
} from './transfer';
import { removeDecimals } from '../../utils/decimals';
import type { FeeEstimateResult } from '../../types/send';
import {
  getDomain as getDomainFromService,
  getDomainFromPublicKey as getDomainFromPublicKeyService,
  getPublicKeyFromDomain as getPublicKeyFromDomainService,
} from './domains';
import {
  validateDestinationAccount as validateDestination,
  type ValidationResult,
} from './validation';
import { SOL_CONSTANTS } from '../../utils/balance';
import type { SolanaNetwork } from '../../types/blockchain';
import type { SolanaWalletBalance } from '../../types/balance';
import type { SolanaBalanceItem } from '../../types/transfer';
import type {
  FetchSolanaBalanceFn,
  FetchSolanaTransactionFn,
  FetchSolanaTransactionsFn,
} from '../../types/transfer';
import type { FetchNftsFromBackendFn, Nft } from '../../types/nft';
import { getAll as getAllNftsFromService } from './nft';
import {
  getRecentTransactions as getRecentTransactionsService,
  type SolanaTransaction,
  type SolanaTransactionPaging,
  type SolanaTransactionListResponse,
} from './transactions';

/**
 * Solana signing key material, as produced by the account factories.
 *
 * The kit signer holds a non-extractable CryptoKey, so the seed is carried
 * alongside it: it is the only recoverable form of the private key, and it is
 * what lets `retrieveSecurePrivateKey()` stay synchronous.
 */
export interface SolanaSigningKey {
  /** 32-byte ed25519 seed */
  seed: Uint8Array;
  /** Non-extractable kit signer. `signer.address` is the base58 public key. */
  signer: KeyPairSigner;
}

/**
 * Options for creating a SolanaAccount instance
 */
export interface SolanaAccountOptions {
  /** Network configuration */
  network: SolanaNetwork;
  /** Account derivation index */
  index: number;
  /** BIP44 derivation path */
  path: string;
  /** Solana signing key material (seed + kit signer) */
  keyPair: SolanaSigningKey;
  /** Function to fetch token balances (DI) */
  fetchBalance: FetchSolanaBalanceFn;
  /** Function to fetch a single transaction (DI) */
  fetchTransaction: FetchSolanaTransactionFn;
  /** Function to fetch transactions list (DI) */
  fetchTransactions: FetchSolanaTransactionsFn;
  /** Function to fetch NFTs from backend (DI) */
  fetchNfts: FetchNftsFromBackendFn;
}

/**
 * @deprecated Use `SolanaWalletBalance` from `types/balance` instead.
 */
export type SolanaBalance = SolanaWalletBalance;

// Re-export types from services for convenience
export type { SolanaTransactionPaging, SolanaTransactionListResponse, SolanaTransaction } from './transactions';

export type { ValidationResult };

/**
 * SolanaAccount provides core functionality for interacting with the Solana blockchain.
 * It manages a keypair and provides methods for querying balances and account information.
 *
 * Features:
 * - Lazy connection initialization for efficient resource usage
 * - Balance queries in both lamports and SOL
 * - Public key and address retrieval
 * - Secure private key access
 */
export class SolanaAccount {
  /** Network configuration */
  readonly network: SolanaNetwork;

  /** Account derivation index */
  readonly index: number;

  /** BIP44 derivation path used for key derivation */
  readonly path: string;

  /** Kit signer, used for off-chain message signing */
  readonly signer: KeyPairSigner;

  /** Public key derived from the signer's address */
  readonly publicKey: PublicKey;

  /** 32-byte ed25519 seed — the only recoverable form of the private key */
  private readonly seed: Uint8Array;

  /** Cached connection instance (lazy initialized) */
  private connection: Connection | null = null;
  /** The nodeUrl used to create the current connection (for comparison) */
  private connectionNodeUrl: string | null = null;
  /** Cached kit RPC client (lazy initialized) */
  private rpc: SolanaRpc | null = null;
  /** The nodeUrl used to create the current kit RPC client */
  private rpcNodeUrl: string | null = null;
  /** Cached kit RPC subscriptions client (lazy initialized) */
  private rpcSubscriptions: SolanaRpcSubscriptions | null = null;
  /** The wsUrl used to create the current kit subscriptions client */
  private rpcWsUrl: string | null = null;
  /** Injected function to fetch token balances */
  private fetchBalanceFn: FetchSolanaBalanceFn;
  /** Injected function to fetch a single transaction */
  private fetchTransactionFn: FetchSolanaTransactionFn;
  /** Injected function to fetch transactions list */
  private fetchTransactionsFn: FetchSolanaTransactionsFn;
  /** Injected function to fetch NFTs from backend */
  private fetchNftsFn: FetchNftsFromBackendFn;

  /**
   * Creates a new SolanaAccount instance
   *
   * @param options - Account configuration options
   */
  constructor(options: SolanaAccountOptions) {
    this.network = options.network;
    this.index = options.index;
    this.path = options.path;
    this.signer = options.keyPair.signer;
    this.seed = options.keyPair.seed;
    this.publicKey = new PublicKey(options.keyPair.signer.address);
    this.fetchBalanceFn = options.fetchBalance;
    this.fetchTransactionFn = options.fetchTransaction;
    this.fetchTransactionsFn = options.fetchTransactions;
    this.fetchNftsFn = options.fetchNfts;
  }

  /**
   * Retrieves the private key encoded as base58 string.
   * WARNING: Handle with care - this exposes sensitive key material.
   *
   * @returns Base58-encoded secret key
   */
  retrieveSecurePrivateKey(): string {
    // An ed25519 secret key in its 64-byte form is the seed followed by the
    // public key — the same bytes the legacy web3.js keypair exposed.
    const secretKey = new Uint8Array(64);
    secretKey.set(this.seed);
    secretKey.set(this.publicKey.toBytes(), 32);
    return bs58.encode(secretKey);
  }

  /**
   * Returns the network ID this account is bound to.
   * Typed accessor exposed so consumers can avoid casting through `network`.
   */
  getNetworkId(): SolanaNetwork['networkId'] {
    return this.network.networkId;
  }

  /**
   * Gets or creates a connection to the Solana network.
   * Uses lazy initialization to avoid creating connections until needed.
   * Always uses the latest network configuration from SOLANA_NETWORKS to ensure
   * the RPC URL is up-to-date (may have been updated by fetchAndMergeNetworkConfigs).
   *
   * @returns Promise resolving to Connection instance
   */
  async getConnection(): Promise<Connection> {
    // Always get the latest network config from SOLANA_NETWORKS in case it was updated
    const { nodeUrl, commitment } = this.getLatestConfig();

    // Recreate connection if nodeUrl changed or if connection doesn't exist
    if (!this.connection || this.connectionNodeUrl !== nodeUrl) {
      this.connection = new Connection(nodeUrl, commitment);
      this.connectionNodeUrl = nodeUrl;
    }
    return this.connection;
  }

  /**
   * Resolves the effective network config, preferring the global
   * SOLANA_NETWORKS entry (which fetchAndMergeNetworkConfigs updates at
   * runtime) over the snapshot this account was constructed with.
   */
  private getLatestConfig(): { nodeUrl: string; wsUrl?: string; commitment: Commitment } {
    const latest = SOLANA_NETWORKS[this.network.id]?.config;
    return {
      nodeUrl: latest?.nodeUrl || this.network.config.nodeUrl,
      wsUrl: latest?.wsUrl || this.network.config.wsUrl,
      commitment: latest?.commitment || this.network.config.commitment || 'confirmed',
    };
  }

  /**
   * Gets or creates the kit RPC client for this network.
   *
   * Sync, unlike `getConnection()`: `createSolanaRpc` performs no I/O. The
   * cache is keyed on nodeUrl for the same reason the connection cache is —
   * the backend catalog can change it after the account was constructed.
   */
  getRpc(): SolanaRpc {
    const { nodeUrl } = this.getLatestConfig();
    if (!this.rpc || this.rpcNodeUrl !== nodeUrl) {
      this.rpc = createSolanaRpc(nodeUrl);
      this.rpcNodeUrl = nodeUrl;
    }
    return this.rpc;
  }

  /**
   * Gets or creates the kit RPC subscriptions client for this network.
   *
   * Uses the configured `wsUrl` when the backend supplies a same-host one,
   * otherwise the endpoint derived from the RPC URL.
   */
  getRpcSubscriptions(): SolanaRpcSubscriptions {
    const { nodeUrl, wsUrl } = this.getLatestConfig();
    const endpoint = resolveSolanaWsUrl(nodeUrl, wsUrl);
    if (!this.rpcSubscriptions || this.rpcWsUrl !== endpoint) {
      this.rpcSubscriptions = createSolanaRpcSubscriptions(endpoint);
      this.rpcWsUrl = endpoint;
    }
    return this.rpcSubscriptions;
  }

  /**
   * Gets the account balance in lamports (raw value from chain).
   *
   * @returns Promise resolving to balance in lamports
   */
  async getCredit(): Promise<number> {
    const connection = await this.getConnection();
    return connection.getBalance(this.publicKey);
  }

  // ==========================================================================
  // Balance Methods (DI-backed, mirrors BitcoinAccount)
  // ==========================================================================

  /**
   * Fetches the Solana balance items from the backend API. Items
   * already carry `price`, `usdBalance`, and `priceChange24h` when the
   * salmon-api `multichain/price-enrichers/solana-price-enricher` has a
   * Jupiter quote for the asset.
   */
  private async fetchSolanaBalance(
    opts?: { includeSpam?: boolean },
  ): Promise<SolanaBalanceItem[]> {
    return this.fetchBalanceFn(this.network.id, this.publicKey.toBase58(), opts);
  }

  /**
   * Reduces priced items into the portfolio 24h delta. Items without
   * `priceChange24h` contribute their USD balance unchanged (so a
   * partially-priced wallet still produces a meaningful number).
   */
  private calculateLast24HoursChange(
    balances: SolanaBalanceItem[],
    usdTotal: number
  ): number {
    if (!usdTotal || usdTotal === 0) return 0;

    let previousTotal = 0;
    balances.forEach((balance) => {
      if (balance.usdBalance && balance.priceChange24h !== undefined && balance.priceChange24h !== null) {
        const priceChangeFactor = 1 + balance.priceChange24h / 100;
        const previousBalance = balance.usdBalance / priceChangeFactor;
        previousTotal += previousBalance;
      } else if (balance.usdBalance) {
        previousTotal += balance.usdBalance;
      }
    });

    return previousTotal === 0 ? 0 : usdTotal - previousTotal;
  }

  /**
   * Returns the complete wallet balance. The salmon-api `/balance`
   * endpoint already attaches USD pricing per item via the multichain
   * `price-enrichers` plug-point, so this method only sorts the items
   * (SOL first, then by USD desc) and computes the portfolio totals.
   */
  async getBalance(opts?: { includeSpam?: boolean }): Promise<SolanaWalletBalance> {
    const items = await this.fetchSolanaBalance(opts);

    // Sort: SOL first, then by usdBalance descending
    items.sort((a, b) => {
      const aIsSol = !a.mint || a.mint === SOL_CONSTANTS.ADDRESS;
      const bIsSol = !b.mint || b.mint === SOL_CONSTANTS.ADDRESS;
      if (aIsSol) return -1;
      if (bIsSol) return 1;
      return (b.usdBalance || 0) - (a.usdBalance || 0);
    });

    const hasAnyPrice = items.some((item) => item.usdBalance !== undefined);
    if (!hasAnyPrice) {
      return { usdTotal: 0, last24HoursChange: 0, items };
    }

    const usdTotal = items.reduce(
      (currentValue, next) => (next.usdBalance || 0) + currentValue,
      0
    );
    const last24HoursChange = this.calculateLast24HoursChange(items, usdTotal);
    return { usdTotal, last24HoursChange, items };
  }

  /**
   * Gets the public key for this account.
   *
   * @returns The account's public key
   */
  getPublicKey(): PublicKey {
    return this.publicKey;
  }

  /**
   * Gets the receive address (base58-encoded public key).
   *
   * @returns Base58-encoded public key string suitable for receiving funds
   */
  getReceiveAddress(): string {
    return this.publicKey.toBase58();
  }

  /**
   * Validates whether a given address is a valid Solana address.
   *
   * @param address - Address string to validate
   * @returns True if the address is valid, false otherwise
   */
  static isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Creates a PublicKey instance from an address string.
   *
   * @param address - Base58-encoded address string
   * @returns PublicKey instance
   * @throws Error if the address is invalid
   */
  static toPublicKey(address: string): PublicKey {
    return new PublicKey(address);
  }

  /**
   * Drops the cached connection and kit clients so the next accessor rebuilds
   * them. Call this when the account is no longer needed.
   */
  async disconnect(): Promise<void> {
    this.connection = null;
    this.connectionNodeUrl = null;
    this.rpc = null;
    this.rpcNodeUrl = null;
    this.rpcSubscriptions = null;
    this.rpcWsUrl = null;
  }

  // ==========================================================================
  // Address Validation
  // ==========================================================================

  /**
   * Validates a destination address for transfers.
   * Checks if address is a valid public key or domain name.
   * Delegates to the validation service.
   *
   * @param address - Address or domain to validate
   * @returns Validation result with type, code, and address type
   */
  async validateDestinationAccount(address: string): Promise<ValidationResult> {
    const connection = await this.getConnection();
    return validateDestination(connection, address);
  }

  // ==========================================================================
  // Domain Name Services
  // ==========================================================================

  /**
   * Gets the domain name associated with this account.
   * Tries AllDomains first, then falls back to .sol domains.
   *
   * @returns Domain name or null if not found
   */
  async getDomain(): Promise<string | null> {
    const connection = await this.getConnection();
    return getDomainFromService(connection, this.publicKey);
  }

  /**
   * Gets the domain name for a given public key.
   * Tries AllDomains first, then falls back to .sol domains.
   *
   * @param publicKey - Public key to look up
   * @returns Domain name or null if not found
   */
  async getDomainFromPublicKey(publicKey: PublicKey | string): Promise<string | null> {
    const connection = await this.getConnection();
    const pk = typeof publicKey === 'string' ? new PublicKey(publicKey) : publicKey;
    return getDomainFromPublicKeyService(connection, pk);
  }

  /**
   * Resolves a domain name to a public key.
   *
   * @param domain - Domain name to resolve (e.g., 'example.sol', 'example.abc')
   * @returns Base58-encoded public key or null if not found
   */
  async getPublicKeyFromDomain(domain: string): Promise<string | null> {
    const connection = await this.getConnection();
    return getPublicKeyFromDomainService(connection, domain);
  }

  // ==========================================================================
  // Transaction History
  // ==========================================================================

  /**
   * Gets a single transaction by ID.
   *
   * @param txId - Transaction ID (signature)
   * @returns Transaction data or null if not found
   */
  async getTransaction(txId: string): Promise<SolanaTransaction | null> {
    const address = this.publicKey.toBase58();
    return this.fetchTransactionFn(this.network.id, address, txId);
  }

  /**
   * Gets recent transactions for this account.
   *
   * @param paging - Optional paging parameters
   * @returns Transaction list with pagination
   */
  async getRecentTransactions(
    paging?: SolanaTransactionPaging
  ): Promise<SolanaTransactionListResponse> {
    const address = this.publicKey.toBase58();
    return getRecentTransactionsService(this.network.id, address, paging, this.fetchTransactionsFn);
  }

  // ==========================================================================
  // Transfer Utilities
  // ==========================================================================

  /**
   * Checks if a destination token account requires a memo for transfers.
   * This is a Token-2022 feature.
   *
   * @param destination - Recipient's public key address
   * @param tokenAddress - Token mint address
   * @returns True if memo is required
   */
  async requiresMemo(
    destination: string,
    tokenAddress: string | null | undefined
  ): Promise<boolean> {
    return checkRequiresMemo(this.getRpc(), address(destination), tokenAddress);
  }

  /**
   * Calculates the transfer fee for Token-2022 tokens with transfer fee extension.
   *
   * @param mint - Token mint address
   * @param amount - Transfer amount (human-readable)
   * @returns Fee amount in token's smallest unit, or null if no fee
   */
  async calculateTransferFee(mint: string, amount: number): Promise<bigint | null> {
    return calcTransferFee(this.getRpc(), mint, amount);
  }

  /**
   * Estimates the total fee for an array of transaction messages.
   *
   * @param messages - Array of transaction messages to estimate
   * @param commitment - Commitment level for fee estimation
   * @returns Total estimated fee in lamports
   */
  async estimateTransactionsFee(
    messages: Message[],
    commitment: Commitment = 'confirmed'
  ): Promise<number> {
    const connection = await this.getConnection();
    const feePromises = messages.map((message) =>
      connection.getFeeForMessage(message, commitment)
    );
    const results = await Promise.all(feePromises);
    return results
      .map(({ value }) => value ?? 0)
      .reduce((sum, fee) => sum + fee, 0);
  }

  // ==========================================================================
  // Transfer Methods
  // ==========================================================================

  /**
   * Creates and executes a transfer transaction for SOL or SPL tokens.
   *
   * @param to - Recipient address (base58)
   * @param token - Token mint address (SOL_ADDRESS for native SOL)
   * @param amount - Amount to transfer (human-readable)
   * @param opts - Transfer options (simulate, memo, decimals)
   * @returns Object containing the transaction ID
   */
  async transfer(
    to: string,
    token: string,
    amount: number,
    opts?: SolanaTransferOptions,
  ): Promise<{ txId: string }> {
    const result = await createTransfer(
      this.getRpc(),
      this.signer,
      address(to),
      token,
      amount,
      opts,
    );
    return { txId: result.txId as string };
  }

  /**
   * Estimates the fee for a transfer transaction.
   *
   * @param to - Recipient address (base58)
   * @param token - Token mint address
   * @param amount - Amount to transfer (human-readable)
   * @param opts - Estimation options
   * @returns Fee estimate result or null if estimation fails
   */
  async estimateTransferFee(
    to: string,
    token: string,
    amount: number,
    opts?: EstimateFeeOptions,
  ): Promise<FeeEstimateResult | null> {
    const fee = await estimateSolanaFee(
      this.getRpc(),
      this.signer,
      address(to),
      token,
      amount,
      opts,
    );
    if (fee === null) return null;
    const feeInSol = removeDecimals(fee, 9);
    return {
      fee: feeInSol.toFixed(9).replace(/0+$/, '').replace(/\.$/, ''),
    };
  }

  // ==========================================================================
  // Not Supported Methods (delegated to separate services in v3)
  // ==========================================================================

  /**
   * Gets available tokens for the network.
   * @deprecated Use token list service directly
   * @throws Error indicating method is not supported
   */
  async getAvailableTokens(): Promise<never> {
    throw new Error('method_not_supported: Use token list service directly');
  }

  /**
   * Gets featured tokens for the network.
   * @deprecated Use token list service directly
   * @throws Error indicating method is not supported
   */
  async getFeaturedTokens(): Promise<never> {
    throw new Error('method_not_supported: Use token list service directly');
  }

  /**
   * Gets the best swap quote for a token pair.
   * @deprecated Use swap service directly
   * @throws Error indicating method is not supported
   */
  async getBestSwapQuote(): Promise<never> {
    throw new Error('method_not_supported: Use swap service directly');
  }

  /**
   * Creates a swap transaction.
   * @deprecated Use swap service directly
   * @throws Error indicating method is not supported
   */
  async createSwapTransaction(): Promise<never> {
    throw new Error('method_not_supported: Use swap service directly');
  }

  /**
   * Gets all NFTs for this account.
   * Uses Helius DAS API with backend fallback via injected fetchNfts.
   *
   * @returns Array of NFTs
   */
  async getAllNfts(): Promise<Nft[]> {
    return getAllNftsFromService(
      this.network,
      this.publicKey.toBase58(),
      false,
      this.fetchNftsFn,
    );
  }
}
