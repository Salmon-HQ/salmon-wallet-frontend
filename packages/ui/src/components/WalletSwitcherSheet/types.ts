import type { WalletSwitcherSheetPropsBase, AccountListItemPropsBase } from '@salmon/shared';

// Re-export Account for consumers
export type { Account } from '@salmon/shared';

/**
 * Props for the WalletSwitcherSheet component (Web/Extension)
 */
export interface WalletSwitcherSheetProps extends WalletSwitcherSheetPropsBase {}

/**
 * Props for the AccountListItem component (Web/Extension)
 * Uses onSelect instead of onPress for web convention
 */
export interface AccountListItemProps extends Omit<
  AccountListItemPropsBase,
  'onPress' | 'canDelete'
> {
  /** Callback when the account row is clicked */
  onSelect: () => void;
}
