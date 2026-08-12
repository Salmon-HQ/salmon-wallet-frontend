/**
 * WalletSwitcherSheet Component
 *
 * A dialog component for selecting and managing wallet accounts
 * in the browser extension.
 *
 * Usage:
 * ```tsx
 * import { WalletSwitcherSheet } from '..';
 *
 * <WalletSwitcherSheet
 *   visible={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   accounts={accounts}
 *   activeAccountId={activeAccountId}
 *   onSelectAccount={handleSelect}
 *   onAddAccount={() => navigate('/create-account')}
 * />
 * ```
 */

export { WalletSwitcherSheet } from './WalletSwitcherSheet';
export type { WalletSwitcherSheetProps, AccountListItemProps } from './types';
