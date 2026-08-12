import type { ViewStyle } from 'react-native';
import type { TransactionDetailModalPropsBase } from '@salmon/shared';

// Re-export Transaction for consumers
export type { Transaction } from '@salmon/shared';

/**
 * Props for the TransactionDetailModal component (React Native)
 */
export interface TransactionDetailModalProps extends TransactionDetailModalPropsBase<ViewStyle> {}
