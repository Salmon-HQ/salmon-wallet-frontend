/**
 * TransactionHistorySheet Component
 *
 * A bottom sheet modal for displaying transaction history.
 * Supports Solana transactions with pagination, loading states, and error handling.
 *
 * @example
 * ```tsx
 * import { TransactionHistorySheet, TransactionItem } from '../components';
 * import { useTransactions } from '@salmon/shared';
 *
 * function ActivityScreen() {
 *   const { transactions, loading, loadMore, hasMore } = useTransactions({
 *     address: walletAddress,
 *     networkId: 'solana-mainnet',
 *   });
 *
 *   return (
 *     <TransactionHistorySheet
 *       visible={isVisible}
 *       onClose={() => setIsVisible(false)}
 *       transactions={transactions}
 *       loading={loading}
 *       hasMore={hasMore}
 *       onLoadMore={loadMore}
 *     />
 *   );
 * }
 * ```
 */

export { TransactionHistorySheet, default } from './TransactionHistorySheet';
export { TransactionItem } from './TransactionItem';
export { PriceImpactBadge } from './PriceImpactBadge';
export { ConversionRateDisplay } from './ConversionRateDisplay';
export { ExplorerLinkButton } from './ExplorerLinkButton';
export { AddressCopyRow } from './AddressCopyRow';

export type {
  TransactionHistorySheetProps,
  TransactionItemProps,
  Transaction,
  TransactionType,
  TransactionStatus,
  TransactionTokenAmount,
  TransactionFee,
  SwapRouteHop,
  SwapRoute,
} from './types';

export type { PriceImpactBadgeProps } from './PriceImpactBadge';
export type { ConversionRateDisplayProps } from './ConversionRateDisplay';
export type { ExplorerLinkButtonProps } from './ExplorerLinkButton';
export type { AddressCopyRowProps } from './AddressCopyRow';
