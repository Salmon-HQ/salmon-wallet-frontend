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
 * A non-negative decimal as an exact integer and a power of ten:
 * `value = units × 10^exponent`. A number is read through its shortest
 * round-trip form, so 1.15 is 115 × 10^-2 rather than the binary
 * 1.149999…, and `1e-7` is read as written.
 *
 * @throws When the value is negative, not finite, or not a decimal.
 */
export function parseDecimal(value: number | string): { units: bigint; exponent: number } {
  const text = String(value).trim();
  const match = /^(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text);
  if (!match || (!match[1] && !match[2])) {
    throw new Error(`Not a non-negative decimal: ${text}`);
  }
  const [, whole, fraction = '', exponent = '0'] = match;
  return { units: BigInt(`${whole}${fraction}`), exponent: Number(exponent) - fraction.length };
}

/** `floor(units × 10^exponent)`, exactly. */
export function shiftDecimal(units: bigint, exponent: number): bigint {
  return exponent >= 0 ? units * 10n ** BigInt(exponent) : units / 10n ** BigInt(-exponent);
}

/**
 * The base units a decimal amount holds at `decimals` places, exactly and
 * truncated: 1.15 at 6 places is 1,150,000, where
 * `Math.floor(1.15 * 1e6)` gives 1,149,999.
 */
export function toBaseUnits(value: number | string, decimals: number): bigint {
  const { units, exponent } = parseDecimal(value);
  return shiftDecimal(units, exponent + decimals);
}

/**
 * Whether an amount names no more decimal places than the token has: "2.5"
 * names one, too many for a token with none. The rule a Solana Pay request is
 * held to, and every typed amount with it: converting a finer amount could
 * only round it to a different one.
 */
export function withinDecimals(amount: string, decimals: number): boolean {
  return (amount.split('.')[1] ?? '').length <= decimals;
}

/**
 * A typed amount a send can take: positive, no larger than the balance, and
 * within the token's decimal places.
 */
export function isSendableAmount(amount: string, balance: number, decimals: number): boolean {
  const value = parseFloat(amount);
  return value > 0 && value <= balance && withinDecimals(amount, decimals);
}

/** Base units as the shortest decimal string: 1,150,000 at 6 places is "1.15". */
export function fromBaseUnits(units: bigint, decimals: number): string {
  if (decimals === 0) return units.toString();
  const digits = units.toString().padStart(decimals + 1, '0');
  return `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`.replace(/\.?0+$/, '');
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
