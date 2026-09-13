/**
 * Activity — the contracts the mobile route and the DOM page both implement:
 * the row, and the four pieces the row and the detail share.
 */
import type { Blockchain, NetworkEnvironment } from '../../config/explorers';
import type { Semantic } from '../../theme/semantic';
import { fontSize } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { getShortAddress } from '../../utils/address';
import type { PriceImpactSeverity } from '../../utils/formatting';
import type { Transaction } from '../index';

/**
 * Props for TransactionItem component (base - platform-agnostic)
 */
export interface TransactionItemPropsBase<TStyle> {
  /** Transaction data */
  transaction: Transaction;
  /** Press handler */
  onPress?: (transaction: Transaction) => void;
  /** Whether to hide balance values */
  hiddenBalance?: boolean;
  /**
   * Address book names by address. The row shows the contact's name in place
   * of the counterparty's short address when the book knows it — a name is
   * the thing the user recognises; the address is only the fallback.
   */
  contacts?: Record<string, string>;
  /** Custom styles */
  style?: TStyle;
}

export type PriceImpactSize = 'small' | 'medium' | 'large';

/** The badge's ink per severity, from the active tokens — the same on both twins. */
export const priceImpactInkFor = (t: Semantic): Record<PriceImpactSeverity, string> => ({
  safe: t.status.success,
  warning: t.status.warning,
  high: t.status.danger,
});

export interface PriceImpactSizeConfig {
  iconSize: number;
  fontSize: number;
  paddingH: number;
  paddingV: number;
}

/** The badge's geometry per size, in unscaled points; mobile scales at render. */
export const PRICE_IMPACT_SIZES: Record<PriceImpactSize, PriceImpactSizeConfig> = {
  small: { iconSize: 12, fontSize: fontSize.micro, paddingH: spacing.xs, paddingV: 2 },
  medium: { iconSize: 14, fontSize: fontSize.caption, paddingH: spacing.sm, paddingV: 4 },
  large: { iconSize: 16, fontSize: fontSize.bodyLg, paddingH: spacing.md, paddingV: 6 },
};

/** Price impact with colour coding by severity — safe, warning, high. */
export interface PriceImpactBadgePropsBase {
  /** Price impact as a string percentage (e.g., "0.5", "1.2") */
  value: string;
  /** Size variant */
  size?: PriceImpactSize;
  /** Whether to show the warning/check icon */
  showIcon?: boolean;
}

/** "1 SOL = 150.25 USDC", or the compact "1:150.25". */
export interface ConversionRateDisplayPropsBase<TStyle> {
  /** Input token symbol */
  fromSymbol: string;
  /** Output token symbol */
  toSymbol: string;
  /** The conversion rate (how many toTokens per 1 fromToken) */
  rate: string;
  /** Optional size variant */
  size?: 'small' | 'medium';
  /** Custom style */
  style?: TStyle;
}

/** A label, a truncated address, and the copy control beside it. */
export type AddressTruncate = 'short' | 'medium' | 'long' | false;

/** Character counts kept on each side of the ellipsis, per truncation mode. */
const ADDRESS_TRUNCATE_CHARS: Record<Exclude<AddressTruncate, false>, number> = {
  short: 4,
  medium: 6,
  long: 8,
};

/** The address as the copy row prints it: whole, or shortened to the mode. */
export function truncatedAddress(address: string, truncate: AddressTruncate): string {
  if (truncate === false) return address;
  return getShortAddress(address, ADDRESS_TRUNCATE_CHARS[truncate]) ?? address;
}

export interface AddressCopyRowPropsBase<TStyle> {
  /** Label for the address (e.g., "From", "To", "Contract") */
  label: string;
  /** The full address to display and copy */
  address: string;
  /** How to truncate the address */
  truncate?: AddressTruncate;
  /** Custom style */
  style?: TStyle;
}

/** The outlined control that opens a block explorer, or a picker of them. */
/** TransactionMark — the token that moved, badged with the type; a swap shows the pair. */
export interface TransactionMarkPropsBase {
  transaction: Transaction;
}

export interface ExplorerLinkButtonPropsBase<TStyle> {
  /** Transaction hash/signature */
  txHash: string;
  /** Blockchain type */
  blockchain?: Blockchain;
  /** Network environment */
  environment?: NetworkEnvironment;
  /** Which explorer to use (if single button mode) */
  explorerKey?: string;
  /** Whether to show as menu with multiple options */
  showMenu?: boolean;
  /** Callback when explorer is opened */
  onPress?: (url: string, explorerName: string) => void;
  /** Custom style */
  style?: TStyle;
}
