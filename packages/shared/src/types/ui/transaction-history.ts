/**
 * Activity — the contracts the mobile route and the DOM page both implement:
 * the row, and the four pieces the row and the detail share.
 */
import type { Blockchain, NetworkEnvironment } from '../../config/explorers';
import { getShortAddress } from '../../utils/address';
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
/** TransactionMark — the token that moved, badged with the type. */
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
