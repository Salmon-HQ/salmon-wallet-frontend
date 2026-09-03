/**
 * Type definitions for the Activity components (Mobile/React Native)
 *
 * Core transaction types are imported from @salmon/shared
 * This file only contains platform-specific component props
 */

import type { ViewStyle } from 'react-native';
import type { TransactionItemPropsBase } from '@salmon/shared';

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
 * Props for TransactionItem component (React Native). The contract — the
 * transaction, the press, the hidden balance and the address book — is the
 * shared one; nothing is added on this side.
 */
export type TransactionItemProps = TransactionItemPropsBase<ViewStyle>;
