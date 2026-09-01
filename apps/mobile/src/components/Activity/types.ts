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
 * Props for TransactionItem component (React Native)
 */
export interface TransactionItemProps extends TransactionItemPropsBase<ViewStyle> {
  /**
   * Address book names by address. The row shows the contact's name in place
   * of the counterparty's short address when the book knows it — a name is
   * the thing the user recognises; the address is only the fallback.
   */
  contacts?: Record<string, string>;
}
