import { address, createSolanaRpc, createSolanaRpcSubscriptions, isAddress } from '@solana/kit';
import type { Address, Commitment } from '@solana/kit';
import {
  SOLANA_NETWORKS,
  resolveSolanaWsUrl,
  type SolanaRpc,
  type SolanaRpcSubscriptions,
} from './networks';
import {
  requiresMemo as checkRequiresMemo,
  calculateTransferFee as calcTransferFee,
} from './transfer';
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
import type { FetchSolanaBalanceFn, FetchSolanaTransactionsFn } from '../../types/transfer';
import type { FetchNftsFromBackendFn, Nft } from '../../types/nft';
import { getAll as getAllNftsFromService } from './nft';
import {
  getRecentTransactions as getRecentTransactionsService,
  type SolanaTransactionPaging,
  type SolanaTransactionListResponse,
} from './transactions';

/**
 * Options every Solana account needs, with or without key material.
 */
export interface SolanaReadAccountOptions {
  /** Network configuration */
  network: SolanaNetwork;
  /** Account derivation index */
  index: number;
  /** BIP44 derivation path — the empty string for an account with no key */
  path: string;
  /** Base58 address this account reads */
  publicKey: Address;
  /** Function to fetch token balances (DI) */
  fetchBalance: FetchSolanaBalanceFn;
  /** Function to fetch transactions list (DI) */
  fetchTransactions: FetchSolanaTransactionsFn;
  /** Function to fetch NFTs from backend (DI) */
  fetchNfts: FetchNftsFromBackendFn;
}

/**
 * Everything a Solana account can do with an address alone: RPC access,
 * balances, NFTs, history, domains, address validation.
 *
 * Signing lives one level down, in `SolanaAccount`. The split is what lets a
 * watch-only account exist at all: it is not a `SolanaAccount` with its
 * signing disabled, it is a type that never had a signer to disable, so the
 * compiler — not a runtime flag someone has to remember to check — is what
 * keeps it out of every signing path.
 */
export class SolanaReadAccount {
  /** Network configuration */
  readonly network: SolanaNetwork;

  /** Account derivation index */
  readonly index: number;

  /** BIP44 derivation path used for key derivation */
  readonly path: string;

  /** Base58 address this account reads */
  readonly publicKey: Address;

  /**
   * Whether this account holds key material. Narrow with
   * `isSignableSolanaAccount` rather than reading it directly — the guard
   * carries the type predicate that unlocks `signer`.
   */
  readonly canSign: boolean = false;

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
  /** Injected function to fetch transactions list */
  private fetchTransactionsFn: FetchSolanaTransactionsFn;
  /** Injected function to fetch NFTs from backend */
  private fetchNftsFn: FetchNftsFromBackendFn;

  constructor(options: SolanaReadAccountOptions) {
    this.network = options.network;
    this.index = options.index;
    this.path = options.path;
    this.publicKey = options.publicKey;
    this.fetchBalanceFn = options.fetchBalance;
    this.fetchTransactionsFn = options.fetchTransactions;
    this.fetchNftsFn = options.fetchNfts;
  }

  /**
   * Returns the network ID this account is bound to.
   * Typed accessor exposed so consumers can avoid casting through `network`.
   */
  getNetworkId(): SolanaNetwork['networkId'] {
    return this.network.networkId;
  }

  /**
   * Resolves the effective network config, preferring the global
   * SOLANA_NETWORKS entry (which fetchAndMergeNetworkConfigs updates at
   * runtime) over the snapshot this account was constructed with.
   */
  protected getLatestConfig(): { nodeUrl: string; wsUrl?: string; commitment: Commitment } {
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
   * Sync: `createSolanaRpc` performs no I/O. The cache is keyed on nodeUrl
   * because the backend catalog can change it after the account was
   * constructed.
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
    // The commitment is load-bearing, not cosmetic: the legacy Connection
    // carried it, while the RPC server defaults to 'finalized'. Dropping it
    // would silently start reading older balances.
    const { commitment } = this.getLatestConfig();
    const { value } = await this.getRpc().getBalance(this.publicKey, { commitment }).send();
    return Number(value);
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
  private async fetchSolanaBalance(opts?: { includeSpam?: boolean }): Promise<SolanaBalanceItem[]> {
    return this.fetchBalanceFn(this.network.id, this.publicKey, opts);
  }

  /**
   * Reduces priced items into the portfolio 24h delta. Items without
   * `priceChange24h` contribute their USD balance unchanged (so a
   * partially-priced wallet still produces a meaningful number).
   */
  private calculateLast24HoursChange(balances: SolanaBalanceItem[], usdTotal: number): number {
    if (!usdTotal || usdTotal === 0) return 0;

    let previousTotal = 0;
    balances.forEach((balance) => {
      if (
        balance.usdBalance &&
        balance.priceChange24h !== undefined &&
        balance.priceChange24h !== null
      ) {
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

    const usdTotal = items.reduce((currentValue, next) => (next.usdBalance || 0) + currentValue, 0);
    const last24HoursChange = this.calculateLast24HoursChange(items, usdTotal);
    return { usdTotal, last24HoursChange, items };
  }

  /**
   * Gets the public key for this account.
   *
   * @returns The account's public key
   */
  getPublicKey(): Address {
    return this.publicKey;
  }

  /**
   * Gets the receive address (base58-encoded public key).
   *
   * @returns Base58-encoded public key string suitable for receiving funds
   */
  getReceiveAddress(): string {
    return this.publicKey;
  }

  /**
   * Validates whether a given address is a valid Solana address.
   *
   * @param address - Address string to validate
   * @returns True if the address is valid, false otherwise
   */
  static isValidAddress(address: string): boolean {
    return isAddress(address);
  }

  /**
   * Drops the cached kit clients so the next accessor rebuilds them.
   * Call this when the account is no longer needed.
   */
  async disconnect(): Promise<void> {
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
    const rpc = this.getRpc();
    return validateDestination(rpc, address);
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
    const rpc = this.getRpc();
    return getDomainFromService(rpc, this.publicKey);
  }

  /**
   * Gets the domain name for a given public key.
   * Tries AllDomains first, then falls back to .sol domains.
   *
   * @param publicKey - Public key to look up
   * @returns Domain name or null if not found
   */
  async getDomainFromPublicKey(publicKey: string): Promise<string | null> {
    const rpc = this.getRpc();
    return getDomainFromPublicKeyService(rpc, address(publicKey));
  }

  /**
   * Resolves a domain name to a public key.
   *
   * @param domain - Domain name to resolve (e.g., 'example.sol', 'example.abc')
   * @returns Base58-encoded public key or null if not found
   */
  async getPublicKeyFromDomain(domain: string): Promise<string | null> {
    const rpc = this.getRpc();
    return getPublicKeyFromDomainService(rpc, domain);
  }

  // ==========================================================================
  // Transaction History
  // ==========================================================================

  /**
   * Gets recent transactions for this account.
   *
   * @param paging - Optional paging parameters
   * @returns Transaction list with pagination
   */
  async getRecentTransactions(
    paging?: SolanaTransactionPaging
  ): Promise<SolanaTransactionListResponse> {
    const address = this.publicKey;
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
    return getAllNftsFromService(this.network, this.publicKey, false, this.fetchNftsFn);
  }
}
