import type { WalletSwitcherSheetPropsBase, AccountListItemPropsBase } from '@salmon/shared';

// Re-export Account for consumers
export type { Account } from '@salmon/shared';

/**
 * Props for the WalletSwitcherSheet component (React Native)
 */
export interface WalletSwitcherSheetProps extends WalletSwitcherSheetPropsBase {}

/**
 * Props for individual account list items (React Native)
 */
export interface AccountListItemProps extends AccountListItemPropsBase {}
