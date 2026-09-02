/**
 * Type definitions for the Activity components (DOM)
 *
 * The contracts are the shared ones (`packages/shared/src/types/ui`); this
 * file adds the DOM's style and class to each.
 */

import type { CSSProperties } from 'react';
import type {
  AddressCopyRowPropsBase,
  ConversionRateDisplayPropsBase,
  ExplorerLinkButtonPropsBase,
  PriceImpactBadgePropsBase,
  Transaction,
  TransactionItemPropsBase,
} from '@salmon/shared';

// Re-export shared types for convenience
export type {
  TransactionType,
  TransactionDisplayStatus as TransactionStatus,
  NftAttribute,
  TransactionTokenAmount,
  TransactionFee,
  SwapRouteHop,
  SwapConversionRate,
  SwapRoute,
  TransactionConfirmationStatus,
  Transaction,
} from '@salmon/shared';

/** Props for TransactionItem (DOM): the shared contract plus a class. */
export interface TransactionItemProps extends TransactionItemPropsBase<CSSProperties> {
  className?: string;
}

/**
 * Props for TransactionHistoryPage (DOM).
 *
 * Mobile's Activity is a route that reads its data from the hooks directly;
 * the DOM page is fed by the side panel's Home, which already holds the
 * transactions, so the page stays presentational.
 */
export interface TransactionHistoryPageProps {
  /** Callback to navigate back */
  onBack: () => void;
  /** Transactions to display */
  transactions: Transaction[];
  /** Whether transactions are loading */
  loading?: boolean;
  /** Whether more transactions are being fetched */
  loadingMore?: boolean;
  /** Callback to load more transactions */
  onLoadMore?: () => void;
  /** Whether there are more transactions to load */
  hasMore?: boolean;
  /** Whether balance values should be hidden */
  hiddenBalance?: boolean;
  /** Address book names by address — a row says who, not where, when known. */
  contacts?: Record<string, string>;
  /** Callback when a transaction is pressed, before the detail opens */
  onTransactionPress?: (transaction: Transaction) => void;
  /** Callback when the detail's explorer action is used */
  onViewExplorer?: (transaction: Transaction) => void;
  /** Callback when the detail's hash is copied */
  onCopyHash?: (hash: string) => void;
  /** Callback when the detail's share action is used */
  onShare?: (transaction: Transaction) => void;
  /** Whether the detail shows chain internals */
  developerMode?: boolean;
  /** Active network ID, used by the detail to pick a block explorer */
  networkId?: string | null;
  /** Error message to display */
  error?: string | null;
  /** Callback to retry loading after an error */
  onRetry?: () => void;
  /** Optional custom styles */
  style?: CSSProperties;
  /** Additional CSS class for the container */
  className?: string;
}

export interface PriceImpactBadgeProps extends PriceImpactBadgePropsBase {
  style?: CSSProperties;
  className?: string;
}

export interface ConversionRateDisplayProps extends ConversionRateDisplayPropsBase<CSSProperties> {
  className?: string;
}

export interface AddressCopyRowProps extends AddressCopyRowPropsBase<CSSProperties> {
  className?: string;
}

export interface ExplorerLinkButtonProps extends ExplorerLinkButtonPropsBase<CSSProperties> {
  className?: string;
}
