/**
 * Type definitions for TransactionHistorySheet (Mobile/React Native)
 *
 * Core transaction types are imported from @salmon/shared
 * This file only contains platform-specific component props
 */

import type { ViewStyle } from 'react-native';
import type { TransactionItemPropsBase, TransactionHistorySheetPropsBase } from '@salmon/shared';

import type { TransactionDetailProps } from '../TransactionDetail/types';

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
 *
 * The detail is a step inside this sheet rather than a sheet of its own, so
 * the sheet also carries what the detail needs. These are mobile-only: the
 * DOM surface still routes its detail through its own page.
 */
export interface TransactionHistorySheetProps
  extends
    TransactionHistorySheetPropsBase<ViewStyle>,
    Pick<
      TransactionDetailProps,
      'onViewExplorer' | 'onCopyHash' | 'onShare' | 'developerMode' | 'networkId'
    > {}
