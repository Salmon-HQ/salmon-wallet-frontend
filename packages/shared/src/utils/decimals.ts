/**
 * Decimal & Unit Conversion Utilities
 *
 * Generic helpers for converting between human-readable amounts
 * and raw blockchain units (lamports, wei, satoshis, etc.).
 */

import { parseUnits, formatUnits } from 'ethers';

// ============================================================================
// Constants
// ============================================================================

/** Satoshis per BTC */
export const SATOSHIS_PER_BTC = 100_000_000;

/** Wei per ETH (bigint) */
export const WEI_PER_ETH_BIGINT = 1_000_000_000_000_000_000n;

// ============================================================================
// Generic Conversion Functions
// ============================================================================

/**
 * Applies decimals to convert human-readable amount to raw amount
 *
 * @param amount - Human-readable amount
 * @param decimals - Number of decimal places
 * @returns Raw amount in smallest unit
 */
export function applyDecimals(amount: number, decimals: number): number {
  return Math.round(parseFloat(amount.toString()) * 10 ** decimals);
}

/**
 * Converts raw amount to human-readable amount
 *
 * @param amount - Raw amount in smallest unit
 * @param decimals - Number of decimal places
 * @returns Human-readable amount
 */
export function removeDecimals(amount: number | bigint, decimals: number): number {
  return Number(amount) / 10 ** decimals;
}

/**
 * The human-readable amount to display for a balance item.
 *
 * `amount / 10 ** decimals` is the answer for almost every mint, but a
 * Token-2022 mint carrying Scaled UI Amount or Interest Bearing stores a
 * multiplier the token program applies on top — a tokenised equity that split,
 * a balance accruing interest. No tokens move; only the figure the holder is
 * meant to see changes. The backend resolves that multiplier and sends the
 * result as `uiAmount`, a decimal string so the wire loses no precision, and
 * omits it entirely when the mint scales one to one.
 *
 * @param item - Balance item as a backend balance endpoint returns it.
 * @returns The amount to render.
 */
export function resolveUiAmount(item: {
  amount: string | number | bigint;
  decimals: number;
  uiAmount?: number | string | null;
}): number {
  if (item.uiAmount) {
    const scaled = typeof item.uiAmount === 'string' ? Number(item.uiAmount) : item.uiAmount;
    if (Number.isFinite(scaled)) return scaled;
  }
  return removeDecimals(Number(item.amount), item.decimals);
}

/**
 * Parses a human-readable amount to smallest unit as bigint
 *
 * @param amount - Human-readable amount (e.g., '1.5')
 * @param decimals - Token decimals
 * @returns Amount in smallest unit
 */
export function parseAmount(amount: string | number, decimals: number): bigint {
  return parseUnits(amount.toString(), decimals);
}

// ============================================================================
// ETH-specific Conversion Functions
// ============================================================================

/**
 * Convert ETH to wei
 *
 * @param ethAmount - Amount in ETH
 * @returns Amount in wei as bigint
 */
export function ethToWei(ethAmount: number | string): bigint {
  const amountStr = typeof ethAmount === 'number' ? ethAmount.toString() : ethAmount;
  const [whole, fraction = ''] = amountStr.split('.');
  const paddedFraction = fraction.padEnd(18, '0').slice(0, 18);
  return BigInt(whole + paddedFraction);
}

/**
 * Convert wei to ETH
 *
 * @param weiAmount - Amount in wei
 * @returns Amount in ETH as string
 */
export function weiToEth(weiAmount: bigint): string {
  return formatUnits(weiAmount, 18);
}

/**
 * Convert wei to ETH as a number
 *
 * @param weiAmount - Amount in wei
 * @returns Amount in ETH as number
 */
export function weiToEthNumber(weiAmount: bigint): number {
  return Number(weiAmount) / Number(WEI_PER_ETH_BIGINT);
}

// ============================================================================
// BTC-specific Conversion Functions
// ============================================================================

/**
 * Converts BTC to satoshis
 *
 * @param btc - Amount in BTC
 * @returns Amount in satoshis as bigint
 */
export function btcToSatoshis(btc: number): bigint {
  return BigInt(Math.round(btc * SATOSHIS_PER_BTC));
}

/**
 * Converts satoshis to BTC
 *
 * @param satoshis - Amount in satoshis
 * @returns Amount in BTC
 */
export function satoshisToBtc(satoshis: number | bigint): number {
  return Number(satoshis) / SATOSHIS_PER_BTC;
}
