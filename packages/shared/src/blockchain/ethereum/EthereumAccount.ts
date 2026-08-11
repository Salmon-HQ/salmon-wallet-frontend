import { JsonRpcProvider, Wallet, isAddress, getAddress } from 'ethers';
import { ethToWei, weiToEthNumber } from '../../utils/decimals';
import { getShortAddress } from '../../utils/address';
import {
  sendTransaction as ethSendTransaction,
  estimateTransferFee as ethEstimateTransferFee,
  formatAmount,
  type TransferOptions,
} from './transfer';
import {
  isNativeEth,
  createNativeToken,
  createERC20Token,
  createERC721Token,
  createERC1155Token,
} from '../../utils/tokens';
import type { FeeEstimateResult } from '../../types/send';
import type { ValidationResult } from '../../types/validation';
import type { EthereumAccountBalance, EthereumWalletBalance } from '../../types/balance';
import type { EthereumBalanceItem } from '../../types/transfer';
import type { EthereumNetwork } from '../../types/blockchain';
import type {
  FetchEthereumBalanceFn,
  FetchEthereumRecentTransactionsFn,
  AccountTransactionListResponse,
  TransactionPaging,
} from '../../types/transfer';

/**
 * Transfer options for EthereumAccount.transfer() and estimateTransferFee()
 */
export interface EthereumAccountTransferOptions extends TransferOptions {
  /** Token type for routing to the correct contract ABI */
  tokenType?: 'native' | 'erc20' | 'erc721' | 'erc1155';
  /** Token symbol */
  symbol?: string;
  /** Token decimals (default 18) */
  decimals?: number;
}

/**
 * Options for creating an EthereumAccount instance
 */
export interface EthereumAccountOptions {
  /** Network configuration */
  network: EthereumNetwork;
  /** Account derivation index */
  index: number;
  /** BIP44 derivation path */
  path: string;
  /** ethers.js Wallet instance for signing transactions */
  wallet: Wallet;
  /** Function to fetch token balances (DI) */
  fetchBalance: FetchEthereumBalanceFn;
  /** Function to fetch recent transactions (DI) */
  fetchRecentTransactions: FetchEthereumRecentTransactionsFn;
}

/**
 * @deprecated Use `EthereumWalletBalance` from `types/balance` instead.
 */
export type EthereumBalance = EthereumWalletBalance;

// EthereumAddressValidationResult removed — validateDestinationAccount now returns shared ValidationResult


/**
 * EthereumAccount provides core functionality for interacting with the Ethereum blockchain.
 * It manages a wallet (keypair) and provides methods for address retrieval and validation.
 *
 * Features:
 * - Lazy connection initialization for efficient resource usage
 * - Address validation using ethers.js
 * - Secure private key access
 * - Network-aware provider connections
 *
 * Note: Balance and transaction methods are designed to work with external API services
 * or will be implemented in separate service modules.
 */
export class EthereumAccount {
  /** Network configuration */
  readonly network: EthereumNetwork;

  /** Account derivation index */
  readonly index: number;

  /** BIP44 derivation path used for key derivation */
  readonly path: string;

  /** ethers.js Wallet instance for signing */
  readonly wallet: Wallet;

  /** Public key derived from wallet */
  readonly publicKey: string;

  /** Cached provider instance (lazy initialized) */
  private provider: JsonRpcProvider | null = null;

  /** Cached connected wallet instance */
  private connectedWallet: Wallet | null = null;

  /** Injected function to fetch token balances */
  private fetchBalanceFn: FetchEthereumBalanceFn;
  /** Injected function to fetch recent transactions */
  private fetchRecentTransactionsFn: FetchEthereumRecentTransactionsFn;

  /**
   * Creates a new EthereumAccount instance
   *
   * @param options - Account configuration options
   */
  constructor(options: EthereumAccountOptions) {
    this.network = options.network;
    this.index = options.index;
    this.path = options.path;
    this.wallet = options.wallet;
    this.publicKey = options.wallet.signingKey.publicKey;
    this.fetchBalanceFn = options.fetchBalance;
    this.fetchRecentTransactionsFn = options.fetchRecentTransactions;
  }

  /**
   * Retrieves the private key as a hex string.
   * WARNING: Handle with care - this exposes sensitive key material.
   *
   * @returns Hex-encoded private key (with 0x prefix)
   */
  retrieveSecurePrivateKey(): string {
    return this.wallet.privateKey;
  }

  /**
   * Returns the network ID this account is bound to.
   * Typed accessor exposed so consumers can avoid casting through `network`.
   */
  getNetworkId(): EthereumNetwork['networkId'] {
    return this.network.networkId;
  }

  /**
   * Gets the public key for this account.
   *
   * @returns The account's public key (hex string with 0x prefix)
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Gets or creates a connection to the Ethereum network.
   * Uses lazy initialization to avoid creating connections until needed.
   *
   * @returns Promise resolving to a connected Wallet instance
   */
  async getConnection(): Promise<Wallet> {
    if (!this.connectedWallet) {
      const { rpcUrl, chainId } = this.network.config;
      this.provider = new JsonRpcProvider(rpcUrl, chainId);
      this.connectedWallet = this.wallet.connect(this.provider);
    }
    return this.connectedWallet;
  }

  /**
   * Gets the JsonRpcProvider for direct provider access.
   *
   * @returns Promise resolving to JsonRpcProvider instance
   */
  async getProvider(): Promise<JsonRpcProvider> {
    if (!this.provider) {
      await this.getConnection();
    }
    return this.provider!;
  }

  /**
   * Gets the receive address (checksummed Ethereum address).
   *
   * @returns Checksummed Ethereum address string suitable for receiving funds
   */
  getReceiveAddress(): string {
    return this.wallet.address;
  }

  /**
   * Gets the account balance in wei (raw value from chain).
   * This is a placeholder - actual balance fetching will be in a balance service.
   *
   * @returns Promise resolving to balance in wei
   */
  async getCredit(): Promise<bigint> {
    const connection = await this.getConnection();
    const balance = await connection.provider!.getBalance(this.wallet.address);
    return balance;
  }

  // ==========================================================================
  // Balance Methods (DI-backed, mirrors BitcoinAccount)
  // ==========================================================================

  /**
   * Fetches the Ethereum balance items from the backend API. Items
   * carry pricing fields when the salmon-api `multichain/price-enrichers`
   * has a quote for the asset (Ethereum has no enricher today, so the
   * passthrough leaves them undefined and `usdTotal` resolves to 0).
   */
  private async fetchEthereumBalance(): Promise<EthereumBalanceItem[]> {
    return this.fetchBalanceFn(this.network.id, this.wallet.address);
  }

  /**
   * Reduces priced items into the portfolio 24h delta. Items without
   * `priceChange24h` contribute their USD balance unchanged.
   */
  private calculateLast24HoursChange(
    balances: EthereumBalanceItem[],
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
   * Returns the complete wallet balance. Pricing comes from the
   * salmon-api server-side; the client only sums totals.
   */
  async getBalance(): Promise<EthereumWalletBalance> {
    const items = await this.fetchEthereumBalance();

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
   * Validates whether a given address is a valid Ethereum address.
   *
   * @param address - Address string to validate
   * @returns True if the address is valid, false otherwise
   */
  static isValidAddress(address: string): boolean {
    return isAddress(address);
  }

  /**
   * Formats an Ethereum address for display (shortened version).
   *
   * @param address - Full Ethereum address
   * @param chars - Number of characters to show at start and end (default: 6)
   * @returns Formatted address like "0x1234...5678"
   */
  static formatAddress(address: string, chars: number = 6): string {
    return getShortAddress(address, chars) ?? address;
  }

  /**
   * Converts an address to checksummed format.
   *
   * @param address - Address string to convert
   * @returns Checksummed address
   * @throws Error if the address is invalid
   */
  static toChecksumAddress(address: string): string {
    return getAddress(address);
  }

  /**
   * Validates whether an address is valid for the account's network.
   *
   * @param address - Address string to validate
   * @returns True if the address is valid, false otherwise
   */
  isValidAddressForNetwork(address: string): boolean {
    return EthereumAccount.isValidAddress(address);
  }

  /** @deprecated Use `weiToEthNumber` from `utils/decimals` directly */
  static weiToEth = weiToEthNumber;

  /** @deprecated Use `ethToWei` from `utils/decimals` directly */
  static ethToWei = ethToWei;

  // ============================================================================
  // Address Validation Methods
  // ============================================================================

  /**
   * Validates a destination address for transfers.
   *
   * @param address - The destination address to validate
   * @returns Validation result object
   */
  async validateDestinationAccount(address: string): Promise<ValidationResult> {
    if (!address || address.trim() === '') {
      return { type: 'ERROR', code: 'invalid' };
    }

    const isValid = EthereumAccount.isValidAddress(address);

    if (!isValid) {
      return { type: 'ERROR', code: 'invalid' };
    }

    // Check if it's a contract address
    const provider = await this.getProvider();
    const code = await provider.getCode(address);
    const isContract = code !== '0x';

    return {
      type: 'SUCCESS',
      code: 'valid',
      addressType: isContract ? 'CONTRACT' : 'EOA',
    };
  }

  /**
   * Checks if transfers to a destination require a memo.
   * Ethereum does not use memos in the same way as other chains.
   *
   * @param _destination - Destination address (unused)
   * @param _token - Token identifier (unused)
   * @returns Always returns false for Ethereum
   */
  async requiresMemo(_destination?: string, _token?: string): Promise<boolean> {
    return false;
  }

  /**
   * Closes the connection and releases resources.
   * Call this when the account is no longer needed.
   */
  async disconnect(): Promise<void> {
    if (this.provider) {
      this.provider.destroy();
    }
    this.provider = null;
    this.connectedWallet = null;
  }

  // ============================================================================
  // Transaction History
  // ============================================================================

  /**
   * Gets recent transactions for this account.
   *
   * @param paging - Optional paging parameters
   * @returns Transaction list with pagination
   */
  async getRecentTransactions(paging?: TransactionPaging): Promise<AccountTransactionListResponse> {
    return this.fetchRecentTransactionsFn(this.network.id, this.wallet.address, paging);
  }

  // ============================================================================
  // Transfer Methods
  // ============================================================================

  /**
   * Executes a transfer of ETH or tokens.
   *
   * @param to - Recipient address
   * @param token - Token contract address (ETH_ADDRESS for native ETH)
   * @param amount - Amount to transfer (human-readable)
   * @param opts - Transfer options (tokenType, decimals, symbol, gasLimit, etc.)
   * @returns Object containing the transaction hash
   */
  async transfer(
    to: string,
    token: string,
    amount: number,
    opts?: EthereumAccountTransferOptions,
  ): Promise<{ txId: string }> {
    const wallet = await this.getConnection();

    let transferToken;
    if (isNativeEth(token) || opts?.tokenType === 'native') {
      transferToken = createNativeToken();
    } else if (opts?.tokenType === 'erc721') {
      transferToken = createERC721Token(token, opts?.symbol);
    } else if (opts?.tokenType === 'erc1155') {
      transferToken = createERC1155Token(token, opts?.symbol);
    } else {
      transferToken = createERC20Token(token, opts?.decimals ?? 18, opts?.symbol);
    }

    const result = await ethSendTransaction(wallet, to, transferToken, amount, opts);
    return { txId: result.txHash };
  }

  /**
   * Estimates the fee for a transfer transaction.
   *
   * @param to - Recipient address
   * @param token - Token contract address
   * @param amount - Amount to transfer (human-readable)
   * @param opts - Transfer options
   * @returns Fee estimate result or null
   */
  async estimateTransferFee(
    to: string,
    token: string,
    amount: number,
    opts?: EthereumAccountTransferOptions,
  ): Promise<FeeEstimateResult | null> {
    const provider = await this.getProvider();

    let transferToken;
    if (isNativeEth(token) || opts?.tokenType === 'native') {
      transferToken = createNativeToken();
    } else if (opts?.tokenType === 'erc721') {
      transferToken = createERC721Token(token, opts?.symbol);
    } else if (opts?.tokenType === 'erc1155') {
      transferToken = createERC1155Token(token, opts?.symbol);
    } else {
      transferToken = createERC20Token(token, opts?.decimals ?? 18, opts?.symbol);
    }

    const estimate = await ethEstimateTransferFee(provider, to, transferToken, amount, opts);
    const feeInEth = formatAmount(estimate.estimatedFee, 18);
    return { fee: feeInEth };
  }

  // ============================================================================
  // Unsupported Methods (throw 'method_not_supported')
  // ============================================================================

  /**
   * Gets domain for this account (ENS).
   * Will be implemented in a separate service.
   *
   * @throws 'method_not_supported'
   */
  async getDomain(): Promise<never> {
    throw 'method_not_supported';
  }

  /**
   * Gets domain from an address (ENS reverse lookup).
   * Will be implemented in a separate service.
   *
   * @param _address - Address (unused)
   * @throws 'method_not_supported'
   */
  async getDomainFromPublicKey(_address: string): Promise<never> {
    throw 'method_not_supported';
  }

  /**
   * Gets address from a domain (ENS lookup).
   * Will be implemented in a separate service.
   *
   * @param _domain - Domain name (unused)
   * @throws 'method_not_supported'
   */
  async getPublicKeyFromDomain(_domain: string): Promise<never> {
    throw 'method_not_supported';
  }

  /**
   * Gets all NFTs for this account.
   * Will be implemented in a separate service.
   *
   * @returns null
   */
  async getAllNfts(): Promise<null> {
    return null;
  }

  /**
   * Gets available tokens.
   * Will be implemented in a separate service.
   *
   * @throws 'method_not_supported'
   */
  async getAvailableTokens(): Promise<never> {
    throw 'method_not_supported';
  }

  /**
   * Gets featured tokens.
   * Will be implemented in a separate service.
   *
   * @throws 'method_not_supported'
   */
  async getFeaturedTokens(): Promise<never> {
    throw 'method_not_supported';
  }

  /**
   * Gets best swap quote.
   * Will be implemented in a separate service.
   *
   * @param _tokenInAddress - Input token address (unused)
   * @param _tokenOutAddress - Output token address (unused)
   * @param _amount - Amount to swap (unused)
   * @param _slippage - Slippage tolerance (unused)
   * @throws 'method_not_supported'
   */
  async getBestSwapQuote(
    _tokenInAddress: string,
    _tokenOutAddress: string,
    _amount: number,
    _slippage?: number
  ): Promise<never> {
    throw 'method_not_supported';
  }

  /**
   * Expires a swap quote.
   * Will be implemented in a separate service.
   *
   * @param _quote - Quote to expire (unused)
   * @throws 'method_not_supported'
   */
  async expireSwapQuote(_quote: unknown): Promise<never> {
    throw 'method_not_supported';
  }

  /**
   * Creates a swap transaction.
   * Will be implemented in a separate service.
   *
   * @param _quote - Swap quote (unused)
   * @throws 'method_not_supported'
   */
  async createSwapTransaction(_quote: unknown): Promise<never> {
    throw 'method_not_supported';
  }

  /**
   * Calculates transfer fee.
   * Returns null for Ethereum (gas is calculated at transaction creation time).
   *
   * @param _tokenAddress - Token address (unused)
   * @param _amount - Transfer amount (unused)
   * @returns null
   */
  async calculateTransferFee(_tokenAddress?: string, _amount?: number): Promise<null> {
    return null;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Creates an EthereumAccountBalance object from wei.
   * Utility method for services that fetch balance data.
   *
   * @param wei - Balance in wei
   * @returns EthereumAccountBalance object with wei and eth values
   */
  static createBalance(wei: bigint): EthereumAccountBalance {
    return {
      wei,
      eth: weiToEthNumber(wei),
    };
  }
}
