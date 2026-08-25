import { address, getAddressEncoder } from '@solana/kit';
import type { KeyPairSigner } from '@solana/kit';
import bs58 from 'bs58';
import {
  createTransfer,
  estimateFee as estimateSolanaFee,
  type TransferOptions as SolanaTransferOptions,
  type EstimateFeeOptions,
} from './transfer';
import { removeDecimals } from '../../utils/decimals';
import type { FeeEstimateResult } from '../../types/send';
import type { SolanaNetwork } from '../../types/blockchain';
import type { SolanaWalletBalance } from '../../types/balance';
import type { FetchSolanaBalanceFn, FetchSolanaTransactionsFn } from '../../types/transfer';
import type { FetchNftsFromBackendFn } from '../../types/nft';
import { SolanaReadAccount } from './SolanaReadAccount';
import type { ValidationResult } from './validation';

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
export type {
  SolanaTransactionPaging,
  SolanaTransactionListResponse,
  SolanaTransaction,
} from './transactions';

export type { ValidationResult };

/**
 * A Solana account that holds key material, and is therefore the only kind
 * that can sign or move funds.
 *
 * Everything readable — balances, NFTs, history, domains, RPC — lives on
 * `SolanaReadAccount`. What this class adds is exactly the dangerous surface:
 * the signer, the seed, and the two methods that use them. A watch-only
 * account is the same read surface without this class on top, so a signing
 * site handed one fails to compile rather than failing at runtime.
 */
export class SolanaAccount extends SolanaReadAccount {
  /** Kit signer, used for off-chain message signing */
  readonly signer: KeyPairSigner;

  /** This account holds key material. */
  override readonly canSign = true as const;

  /** 32-byte ed25519 seed — the only recoverable form of the private key */
  private readonly seed: Uint8Array;

  /**
   * Creates a new SolanaAccount instance
   *
   * @param options - Account configuration options
   */
  constructor(options: SolanaAccountOptions) {
    super({
      network: options.network,
      index: options.index,
      path: options.path,
      publicKey: options.keyPair.signer.address,
      fetchBalance: options.fetchBalance,
      fetchTransactions: options.fetchTransactions,
      fetchNfts: options.fetchNfts,
    });
    this.signer = options.keyPair.signer;
    this.seed = options.keyPair.seed;
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
    secretKey.set(getAddressEncoder().encode(this.publicKey), 32);
    return bs58.encode(secretKey);
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
    opts?: SolanaTransferOptions
  ): Promise<{ txId: string }> {
    const result = await createTransfer(
      this.getRpc(),
      this.signer,
      address(to),
      token,
      amount,
      opts
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
    opts?: EstimateFeeOptions
  ): Promise<FeeEstimateResult | null> {
    const fee = await estimateSolanaFee(
      this.getRpc(),
      this.signer,
      address(to),
      token,
      amount,
      opts
    );
    if (fee === null) return null;
    const feeInSol = removeDecimals(fee, 9);
    return {
      fee: feeInSol.toFixed(9).replace(/0+$/, '').replace(/\.$/, ''),
    };
  }
}
