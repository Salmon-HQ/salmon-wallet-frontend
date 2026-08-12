/**
 * Send-transaction domain types.
 *
 * @module types/send
 */

/**
 * Token information for the send flow.
 */
export interface SendTokenInfo {
  /** Token address/mint */
  address: string;
  /** Token decimals */
  decimals: number;
  /** Token symbol */
  symbol: string;
}

/**
 * Parameters for fee estimation and transaction execution.
 */
export interface SendTransactionParams {
  /** Token to send */
  token: SendTokenInfo;
  /** Recipient address */
  recipientAddress: string;
  /** Resolved address to execute against when the recipient is a domain */
  resolvedRecipientAddress?: string;
  /** Amount in human-readable format */
  amount: number;
}

/**
 * Fee estimation result.
 */
export interface FeeEstimateResult {
  /** Fee amount in native token units (e.g., "0.000005") */
  fee: string;
  /** Fee amount in USD */
  feeUsd?: string;
}

/**
 * Transaction status for the send flow.
 */
export type SendTransactionStatus =
  'idle' | 'estimating-fee' | 'creating' | 'sending' | 'success' | 'failed';
