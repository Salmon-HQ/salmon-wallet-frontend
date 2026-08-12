/**
 * Type definitions for TransactionHistorySheet (Mobile/React Native)
 *
 * Core transaction types are imported from @salmon/shared
 * This file only contains platform-specific component props
 */

import type { ViewStyle } from 'react-native';
import type { TransactionItemPropsBase, TransactionHistorySheetPropsBase } from '@salmon/shared';

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

/**
 * Props for TransactionItem component (React Native)
 */
export interface TransactionItemProps extends TransactionItemPropsBase<ViewStyle> {}

/**
 * Props for TransactionHistorySheet component (React Native)
 */
export interface TransactionHistorySheetProps extends TransactionHistorySheetPropsBase<ViewStyle> {}
