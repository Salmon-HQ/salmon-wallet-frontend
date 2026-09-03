import * as bitcoin from 'bitcoinjs-lib';
import type { BIP32Interface } from 'bip32';
import type { FeeEstimateResult } from '../../types/send';
import type { ValidationResult, AddressType } from '../../types/validation';
import { satoshisToBtc, btcToSatoshis } from '../../utils/decimals';
import { getShortAddress } from '../../utils/address';
import { sendBitcoin, estimateBitcoinFee } from './transfer';
import type {
  BitcoinBalanceItem,
  UTXO,
  TransactionPaging,
  AccountTransactionListResponse,
  SigningKeyPair,
  FetchBitcoinBalanceFn,
  FetchBitcoinRecentTransactionsFn,
  FetchUtxosFn,
  BroadcastTransactionFn,
  FetchTransactionHexFn,
} from '../../types/transfer';

/**
 * Transfer options for BitcoinAccount.transfer() and estimateTransferFee()
 */
export interface BitcoinTransferOptions {
  /** Fee rate in satoshis per byte */
  feeRate?: number;
}
import type { BitcoinAccountBalance, BitcoinWalletBalance } from '../../types/balance';
import type { BitcoinNetwork } from '../../types/blockchain';

/**
 * Bitcoin keypair containing public address and private key (WIF format)
 */
export interface BitcoinKeyPair {
  /** P2PKH address (legacy format starting with 1 or m/n) */
  address: string;
  /** Private key in Wallet Import Format (WIF) */
  privateKeyWIF: string;
  /** Raw public key (33 bytes compressed) */
  publicKey: Uint8Array;
}

/**
 * Options for creating a BitcoinAccount instance
 */
export interface BitcoinAccountOptions {
  /** Network configuration */
  network: BitcoinNetwork;
  /** Account derivation index */
  index: number;
  /** BIP44 derivation path */
  path: string;
  /** Bitcoin keypair for signing transactions */
  keyPair: BitcoinKeyPair;
  /** Original BIP32 node (for advanced operations) */
  node?: BIP32Interface;
  /** Function to fetch balance from the API */
  fetchBalance: FetchBitcoinBalanceFn;
  /** Function to fetch recent transactions */
  fetchRecentTransactions: FetchBitcoinRecentTransactionsFn;
  /** Function to fetch UTXOs for transaction building */
  fetchUtxos: FetchUtxosFn;
  /** Function to broadcast signed transactions */
  broadcastTransaction: BroadcastTransactionFn;
  /** Function to read a previous transaction's raw hex, for P2PKH inputs */
  fetchTransactionHex: FetchTransactionHexFn;
}

// Re-export for backwards compatibility
export type { BitcoinAccountBalance } from '../../types/balance';

// AddressValidationResult removed — validateDestinationAccount now returns shared ValidationResult

// Re-export for backwards compatibility
export type { BitcoinWalletBalance } from '../../types/balance';

/**
 * BitcoinAccount provides core functionality for interacting with the Bitcoin blockchain.
 * It manages a keypair and provides methods for address retrieval and validation.
 *
 * Features:
 * - P2PKH (Pay-to-Public-Key-Hash) address support
 * - Address validation for multiple formats
 * - Secure private key access (WIF format)
 * - Network-aware address generation
 *
 * Note: Balance and transaction methods are designed to work with external API services
 * (like the Salmon API) since Bitcoin doesn't have a native RPC for balance queries.
 */
export class BitcoinAccount {
  /** Network configuration */
  readonly network: BitcoinNetwork;

  /** Account derivation index */
  readonly index: number;

  /** BIP44 derivation path used for key derivation */
  readonly path: string;

  /** Bitcoin keypair for signing */
  readonly keyPair: BitcoinKeyPair;

  /** P2PKH address derived from public key */
  readonly address: string;

  /** Original BIP32 node for advanced operations (optional) */
  private readonly node?: BIP32Interface;

  private readonly fetchBalanceFn: FetchBitcoinBalanceFn;
  private readonly fetchRecentTransactionsFn: FetchBitcoinRecentTransactionsFn;
  private readonly fetchUtxosFn: FetchUtxosFn;
  private readonly broadcastTransactionFn: BroadcastTransactionFn;
  private readonly fetchTransactionHexFn: FetchTransactionHexFn;

  /**
   * Creates a new BitcoinAccount instance
   *
   * @param options - Account configuration options
   */
  constructor(options: BitcoinAccountOptions) {
    this.network = options.network;
    this.index = options.index;
    this.path = options.path;
    this.keyPair = options.keyPair;
    this.address = options.keyPair.address;
    this.node = options.node;
    this.fetchBalanceFn = options.fetchBalance;
    this.fetchRecentTransactionsFn = options.fetchRecentTransactions;
    this.fetchUtxosFn = options.fetchUtxos;
    this.broadcastTransactionFn = options.broadcastTransaction;
    this.fetchTransactionHexFn = options.fetchTransactionHex;
  }

  /**
   * Retrieves the private key in WIF (Wallet Import Format).
   * WARNING: Handle with care - this exposes sensitive key material.
   *
   * @returns WIF-encoded private key
   */
  retrieveSecurePrivateKey(): string {
    return this.keyPair.privateKeyWIF;
  }

  /**
   * Returns the network ID this account is bound to.
   * Typed accessor exposed so consumers can avoid casting through `network`.
   */
  getNetworkId(): BitcoinNetwork['networkId'] {
    return this.network.networkId;
  }

  /**
   * Gets the public key for this account.
   *
   * @returns The account's public key as Uint8Array (33 bytes compressed)
   */
  getPublicKey(): Uint8Array {
    return this.keyPair.publicKey;
  }

  /**
   * Gets the receive address (P2PKH format).
   *
   * @returns P2PKH address string suitable for receiving funds
   */
  getReceiveAddress(): string {
    return this.address;
  }

  /**
   * Formats a Bitcoin address for display (shortened version).
   *
   * @param address - Full Bitcoin address
   * @param chars - Number of characters to show at start and end (default: 8)
   * @returns Formatted address like "1A1zP1eP...b4Vr9HG"
   */
  static formatAddress(address: string, chars: number = 8): string {
    return getShortAddress(address, chars) ?? address;
  }

  /**
   * Validates whether a given address is a valid Bitcoin address.
   * Supports P2PKH (legacy), P2SH, and Bech32 (native SegWit) formats.
   *
   * @param address - Address string to validate
   * @param network - Optional network to validate against (defaults to mainnet)
   * @returns True if the address is valid, false otherwise
   */
  static isValidAddress(
    address: string,
    network: bitcoin.Network = bitcoin.networks.bitcoin
  ): boolean {
    try {
      bitcoin.address.toOutputScript(address, network);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates whether an address is valid for the account's network.
   *
   * @param address - Address string to validate
   * @returns True if the address is valid for this network, false otherwise
   */
  isValidAddressForNetwork(address: string): boolean {
    return BitcoinAccount.isValidAddress(address, this.network.config.network);
  }

  /**
   * Gets the address type (P2PKH, P2SH, P2WPKH, P2WSH, P2TR).
   *
   * @param address - Address string to analyze
   * @param network - Optional network (defaults to mainnet)
   * @returns Address type string or null if invalid
   */
  static getAddressType(
    address: string,
    _network: bitcoin.Network = bitcoin.networks.bitcoin
  ): 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr' | null {
    try {
      // Legacy P2PKH addresses start with 1 (mainnet) or m/n (testnet)
      if (address.match(/^[1mn]/)) {
        bitcoin.address.fromBase58Check(address);
        return 'p2pkh';
      }

      // P2SH addresses start with 3 (mainnet) or 2 (testnet)
      if (address.match(/^[32]/)) {
        bitcoin.address.fromBase58Check(address);
        return 'p2sh';
      }

      // Bech32 addresses
      if (address.toLowerCase().startsWith('bc1') || address.toLowerCase().startsWith('tb1')) {
        const decoded = bitcoin.address.fromBech32(address);
        if (decoded.version === 0) {
          return decoded.data.length === 20 ? 'p2wpkh' : 'p2wsh';
        }
        if (decoded.version === 1 && decoded.data.length === 32) {
          return 'p2tr';
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /** @deprecated Use `satoshisToBtc` from `utils/decimals` directly */
  static satoshisToBtc = satoshisToBtc;

  /** @deprecated Use `btcToSatoshis` from `utils/decimals` directly */
  static btcToSatoshis = btcToSatoshis;

  // ============================================================================
  // Balance Methods
  // ============================================================================

  /**
   * Fetches the raw Bitcoin balance from the API.
   *
   * @returns Promise resolving to balance items array
   */
  private async fetchBitcoinBalance(): Promise<BitcoinBalanceItem[]> {
    return this.fetchBalanceFn(this.network.id, this.address);
  }

  /**
   * Reduces priced items into the portfolio 24h delta. Items without
   * `priceChange24h` contribute their USD balance unchanged so a
   * partially-priced wallet still produces a meaningful number.
   */
  private calculateLast24HoursChange(balances: BitcoinBalanceItem[], usdTotal: number): number {
    if (!usdTotal || usdTotal === 0) {
      return 0;
    }

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

    if (previousTotal === 0) {
      return 0;
    }

    return usdTotal - previousTotal;
  }

  /**
   * Gets the primary balance amount (in satoshis).
   *
   * @returns Promise resolving to balance in satoshis
   */
  async getCredit(): Promise<number> {
    const bitcoinBalance = await this.fetchBitcoinBalance();
    return bitcoinBalance[0]?.amount ?? 0;
  }

  /**
   * Returns the complete wallet balance. The salmon-api `/balance`
   * endpoint already attaches USD pricing per item via the multichain
   * `price-enrichers` plug-point, so this method only computes the
   * portfolio totals client-side.
   */
  async getBalance(): Promise<BitcoinWalletBalance> {
    const items = await this.fetchBitcoinBalance();

    const hasAnyPrice = items.some((item) => item.usdBalance !== undefined);
    if (!hasAnyPrice) {
      return { usdTotal: 0, last24HoursChange: 0, items };
    }

    const usdTotal = items.reduce((currentValue, next) => (next.usdBalance || 0) + currentValue, 0);
    const last24HoursChange = this.calculateLast24HoursChange(items, usdTotal);
    return { usdTotal, last24HoursChange, items };
  }

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

    const isValid = this.isValidAddressForNetwork(address);

    if (!isValid) {
      return { type: 'ERROR', code: 'invalid' };
    }

    const addrType = BitcoinAccount.getAddressType(address, this.network.config.network);
    const addressType = addrType ? (addrType.toUpperCase() as AddressType) : 'PUBLIC_KEY';

    return { type: 'SUCCESS', code: 'valid', addressType };
  }

  /**
   * Checks if transfers to a destination require a memo.
   * Bitcoin does not use memos.
   *
   * @param _destination - Destination address (unused)
   * @param _token - Token identifier (unused)
   * @returns Always returns false for Bitcoin
   */
  async requiresMemo(_destination?: string, _token?: string): Promise<boolean> {
    return false;
  }

  // ============================================================================
  // Transaction Methods
  // ============================================================================

  /**
   * Gets recent transactions with pagination support.
   *
   * @param paging - Pagination parameters
   * @returns Promise resolving to paginated transaction list
   */
  async getRecentTransactions(paging?: TransactionPaging): Promise<AccountTransactionListResponse> {
    return this.fetchRecentTransactionsFn(this.network.id, this.address, paging);
  }

  // ============================================================================
  // UTXO and Broadcast Methods (DI-backed)
  // ============================================================================

  /**
   * Fetches UTXOs for this account's address.
   *
   * @returns Promise resolving to array of UTXOs
   */
  async getUtxos(): Promise<UTXO[]> {
    return this.fetchUtxosFn(this.network.id, this.address);
  }

  /**
   * Broadcasts a signed transaction.
   *
   * @param serializedTx - Signed transaction hex
   * @returns Promise resolving to broadcast result
   */
  async broadcast(serializedTx: string): Promise<{ txId?: string; success: boolean }> {
    return this.broadcastTransactionFn(this.network.id, this.address, serializedTx);
  }

  // ============================================================================
  // Transfer Methods
  // ============================================================================

  /**
   * Executes a Bitcoin transfer.
   *
   * @param to - Recipient address
   * @param _token - Ignored (Bitcoin has no tokens)
   * @param amount - Amount in BTC (human-readable)
   * @param opts - Transfer options (feeRate)
   * @returns Object containing the transaction ID
   */
  async transfer(
    to: string,
    _token: string,
    amount: number,
    _opts?: BitcoinTransferOptions
  ): Promise<{ txId: string }> {
    const node = this.getBip32Node();
    if (!node) {
      throw new Error('Bitcoin BIP32 node not available');
    }
    const signingKeyPair: SigningKeyPair = { ...this.keyPair, node };

    const result = await sendBitcoin(
      this.network,
      signingKeyPair,
      to,
      amount,
      () => this.getUtxos(),
      (_networkId, _address, serializedTx) => this.broadcast(serializedTx),
      this.fetchTransactionHexFn
    );

    if (!result.success) {
      throw new Error(result.error || 'Bitcoin transaction failed');
    }

    return { txId: result.txId || '' };
  }

  /**
   * Estimates the fee for a Bitcoin transfer.
   *
   * @param _to - Recipient address (unused for fee estimation)
   * @param _token - Ignored
   * @param _amount - Amount (unused for fee estimation)
   * @param opts - Transfer options (feeRate)
   * @returns Fee estimate result or null
   */
  async estimateTransferFee(
    _to: string,
    _token: string,
    _amount: number,
    opts?: BitcoinTransferOptions
  ): Promise<FeeEstimateResult | null> {
    const utxos = await this.getUtxos();
    const fee = estimateBitcoinFee(utxos.length, 2, opts?.feeRate);
    const feeInBtc = satoshisToBtc(fee);
    return {
      fee: feeInBtc.toFixed(8).replace(/0+$/, '').replace(/\.$/, ''),
    };
  }

  // ============================================================================
  // Unsupported Methods (throw 'method_not_supported')
  // ============================================================================

  /**
   * Gets domain for this account.
   * Not supported for Bitcoin.
   *
   * @throws 'method_not_supported'
   */
  async getDomain(): Promise<never> {
    throw 'method_not_supported';
  }

  /**
   * Gets domain from a public key.
   * Not supported for Bitcoin.
   *
   * @param _publicKey - Public key (unused)
   * @throws 'method_not_supported'
   */
  async getDomainFromPublicKey(_publicKey: string): Promise<never> {
    throw 'method_not_supported';
  }

  /**
   * Gets public key from a domain.
   * Not supported for Bitcoin.
   *
   * @param _domain - Domain name (unused)
   * @throws 'method_not_supported'
   */
  async getPublicKeyFromDomain(_domain: string): Promise<never> {
    throw 'method_not_supported';
  }

  /**
   * Gets all NFTs for this account.
   * Not supported for Bitcoin.
   *
   * @returns null (Bitcoin doesn't support NFTs in this context)
   */
  async getAllNfts(): Promise<null> {
    return null;
  }

  /**
   * Gets available tokens.
   * Not supported for Bitcoin.
   *
   * @throws 'method_not_supported'
   */
  async getAvailableTokens(): Promise<never> {
    throw 'method_not_supported';
  }

  /**
   * Gets featured tokens.
   * Not supported for Bitcoin.
   *
   * @throws 'method_not_supported'
   */
  async getFeaturedTokens(): Promise<never> {
    throw 'method_not_supported';
  }

  /**
   * Gets best swap quote.
   * Not supported for Bitcoin.
   *
   * @param _tokenInId - Input token ID (unused)
   * @param _tokenOutId - Output token ID (unused)
   * @param _amount - Amount to swap (unused)
   * @param _slippage - Slippage tolerance (unused)
   * @throws 'method_not_supported'
   */
  async getBestSwapQuote(
    _tokenInId: string,
    _tokenOutId: string,
    _amount: number,
    _slippage?: number
  ): Promise<never> {
    throw 'method_not_supported';
  }

  /**
   * Expires a swap quote.
   * Not supported for Bitcoin.
   *
   * @param _quote - Quote to expire (unused)
   * @throws 'method_not_supported'
   */
  async expireSwapQuote(_quote: unknown): Promise<never> {
    throw 'method_not_supported';
  }

  /**
   * Creates a swap transaction.
   * Not supported for Bitcoin.
   *
   * @param _quote - Swap quote (unused)
   * @param _tokenInId - Input token ID (unused)
   * @param _tokenOutId - Output token ID (unused)
   * @param _amount - Amount to swap (unused)
   * @throws 'method_not_supported'
   */
  async createSwapTransaction(
    _quote: unknown,
    _tokenInId: string,
    _tokenOutId: string,
    _amount: number
  ): Promise<never> {
    throw 'method_not_supported';
  }

  /**
   * Calculates transfer fee.
   * Returns null for Bitcoin (fee is calculated at transaction creation time).
   *
   * @param _mint - Token mint (unused)
   * @param _amount - Transfer amount (unused)
   * @returns null
   */
  async calculateTransferFee(_mint?: string, _amount?: number): Promise<null> {
    return null;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Creates a BitcoinAccountBalance object from satoshis.
   * Utility method for services that fetch balance data.
   *
   * @param satoshis - Balance in satoshis
   * @returns BitcoinAccountBalance object with satoshis and btc values
   */
  static createBalance(satoshis: number | bigint): BitcoinAccountBalance {
    const satoshisBigInt = typeof satoshis === 'bigint' ? satoshis : BigInt(satoshis);
    return {
      satoshis: satoshisBigInt,
      btc: satoshisToBtc(satoshisBigInt),
    };
  }

  /**
   * Gets the BIP32 node if available.
   * Used for advanced operations like signing.
   *
   * @returns BIP32Interface node or undefined
   */
  getBip32Node(): BIP32Interface | undefined {
    return this.node;
  }
}
