/**
 * WalletSwitcherSheet Component
 *
 * A dialog component for selecting and managing wallet accounts.
 * Displays a list of accounts with avatars, names, addresses,
 * and action buttons for editing and deleting accounts.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { CheckIcon, PencilSimpleIcon, PlusIcon, TrashIcon, iconSize } from '../../icons';
import {
  colors,
  semantic,
  spacing,
  getShortAddress,
  getAvatarColor,
  getInitials,
  fontFamily,
  fontSize as fontSizeTokens,
  fontWeight as fontWeightTokens,
  componentSizes,
  duration,
  easing,
  isWatchOnlyAccount,
} from '@salmon/shared';
import { WatchOnlyBadge } from '../WatchOnlyBadge';
import { BaseSheetDialog } from '../BaseSheetDialog';
import { ConfirmDialog } from '../ConfirmDialog';

import type { WalletSwitcherSheetProps, AccountListItemProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const StyledList = styled(List)({
  padding: `${spacing.sm}px 0`,
});

const StyledListItem = styled(ListItem)<{ $isActive?: boolean }>(({ $isActive }) => ({
  padding: `${spacing.md}px ${spacing.xl}px`,
  cursor: 'pointer',
  backgroundColor: $isActive ? colors.accent.tint : 'transparent',
  transition: `background-color ${duration.normal} ${easing.ease}`,
  '&:hover': {
    backgroundColor: $isActive ? colors.accent.tintHover : colors.background.card,
  },
}));

const AccountAvatar = styled(Avatar)<{ $bgColor: string }>(({ $bgColor }) => ({
  backgroundColor: $bgColor,
  width: componentSizes.iconSize2XL,
  height: componentSizes.iconSize2XL,
  fontSize: fontSizeTokens.base,
  fontWeight: fontWeightTokens.semibold,
  color: colors.text.primary,
}));

const AccountName = styled('span')({
  fontSize: fontSizeTokens.base,
  fontWeight: fontWeightTokens.semibold,
  color: colors.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  display: 'block',
});

const AccountAddress = styled('span')({
  fontSize: fontSizeTokens.sm,
  color: colors.text.secondary,
  fontFamily: fontFamily.mono,
  display: 'block',
});

const ActionButtonsContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.xs,
});

const ActionIconButton = styled(IconButton)({
  padding: spacing.xs,
  color: colors.text.secondary,
  '&:hover': {
    backgroundColor: colors.card.border,
  },
});

const DeleteIconButton = styled(IconButton)({
  padding: spacing.xs,
  color: semantic.status.danger,
  '&:hover': {
    backgroundColor: semantic.status.dangerTint,
  },
});

const CheckIconStyled = styled(CheckIcon)({
  color: colors.accent.primary,
  marginLeft: spacing.sm,
});

const AddAccountButton = styled(Button)({
  width: '100%',
  padding: `${spacing.md}px ${spacing.xl}px`,
  justifyContent: 'flex-start',
  textTransform: 'none',
  color: colors.accent.primary,
  fontSize: fontSizeTokens.base,
  fontWeight: fontWeightTokens.semibold,
  '&:hover': {
    backgroundColor: colors.accent.tint,
  },
});

// ============================================================================
// AccountListItem Component
// ============================================================================

/**
 * Individual account row in the wallet switcher list.
 */
function AccountListItem({ account, isActive, onSelect, onEdit, onDelete }: AccountListItemProps) {
  const { t } = useTranslation();
  const avatarColor = useMemo(() => getAvatarColor(account.id), [account.id]);
  const initials = useMemo(() => getInitials(account.name), [account.name]);
  const [imgError, setImgError] = useState(false);

  // Get the primary address from the first available network account
  const address = (() => {
    const networksAccounts = account.networksAccounts || {};
    const networkIds = Object.keys(networksAccounts);

    for (const networkId of networkIds) {
      const accounts = networksAccounts[networkId];
      if (accounts) {
        for (const blockchainAccount of accounts) {
          if (blockchainAccount) {
            return blockchainAccount.getReceiveAddress();
          }
        }
      }
    }
    return undefined;
  })();

  const truncatedAddress = getShortAddress(address, 6) || '...';

  const handleEditClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onEdit?.();
    },
    [onEdit]
  );

  const handleDeleteClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onDelete?.();
    },
    [onDelete]
  );

  return (
    <StyledListItem
      $isActive={isActive}
      onClick={onSelect}
      data-testid={`wallet-switcher-account-${account.id}`}
      role="button"
      aria-label={
        isActive
          ? t('accessibility.active_account', '{{name}}, active', { name: account.name })
          : account.name
      }
    >
      <ListItemAvatar>
        {account.avatar && !imgError ? (
          <Avatar
            src={account.avatar}
            sx={{ width: componentSizes.iconSize2XL, height: componentSizes.iconSize2XL }}
            imgProps={{ alt: '', onError: () => setImgError(true) }}
          />
        ) : (
          <AccountAvatar $bgColor={avatarColor}>{initials}</AccountAvatar>
        )}
      </ListItemAvatar>
      <ListItemText
        primary={<AccountName>{account.name}</AccountName>}
        secondary={
          <Box
            component="span"
            sx={{ display: 'flex', alignItems: 'center', gap: `${spacing.xs}px` }}
          >
            <AccountAddress>{truncatedAddress}</AccountAddress>
            {isWatchOnlyAccount(account) && (
              <WatchOnlyBadge testID={`wallet-switcher-watch-only-${account.id}`} />
            )}
          </Box>
        }
        sx={{ marginRight: spacing.lg }}
      />
      <ListItemSecondaryAction>
        <ActionButtonsContainer>
          {isActive && <CheckIconStyled size={iconSize.md} />}
          {onEdit && (
            <ActionIconButton
              size="small"
              onClick={handleEditClick}
              aria-label={t('accessibility.edit_account')}
              data-testid={`wallet-switcher-edit-${account.id}`}
            >
              <PencilSimpleIcon size={iconSize.md} />
            </ActionIconButton>
          )}
          {onDelete && (
            <DeleteIconButton
              size="small"
              onClick={handleDeleteClick}
              aria-label={t('accessibility.delete_account')}
              data-testid={`wallet-switcher-delete-${account.id}`}
            >
              <TrashIcon size={iconSize.md} />
            </DeleteIconButton>
          )}
        </ActionButtonsContainer>
      </ListItemSecondaryAction>
    </StyledListItem>
  );
}

// ============================================================================
// WalletSwitcherSheet Component
// ============================================================================

/**
 * Dialog for switching between and managing wallet accounts.
 *
 * Features:
 * - List of all accounts with colored avatars and initials
 * - Truncated addresses (first 6...last 4 characters)
 * - Active account indicator (checkmark)
 * - Edit and delete buttons per account
 * - Add new account button
 * - Delete confirmation dialog
 *
 * @example
 * ```tsx
 * <WalletSwitcherSheet
 *   visible={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   accounts={accounts}
 *   activeAccountId={activeAccount.id}
 *   onSelectAccount={(id) => changeAccount(id)}
 *   onAddAccount={() => navigate('/create-account')}
 *   onEditAccount={(id) => navigate(`/edit-account/${id}`)}
 *   onDeleteAccount={(id) => removeAccount(id)}
 * />
 * ```
 */
export function WalletSwitcherSheet({
  visible,
  onClose,
  accounts,
  activeAccountId,
  onSelectAccount,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
}: WalletSwitcherSheetProps) {
  const { t } = useTranslation();
  const [deleteConfirmAccountId, setDeleteConfirmAccountId] = useState<string | null>(null);

  // Find the account being deleted for display in confirmation
  const accountToDelete = useMemo(
    () => accounts.find((acc) => acc.id === deleteConfirmAccountId),
    [accounts, deleteConfirmAccountId]
  );

  const handleSelectAccount = useCallback(
    (accountId: string) => {
      onSelectAccount(accountId);
      onClose();
    },
    [onSelectAccount, onClose]
  );

  const handleDeleteRequest = useCallback((accountId: string) => {
    setDeleteConfirmAccountId(accountId);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteConfirmAccountId && onDeleteAccount) {
      onDeleteAccount(deleteConfirmAccountId);
    }
    setDeleteConfirmAccountId(null);
  }, [deleteConfirmAccountId, onDeleteAccount]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmAccountId(null);
  }, []);

  const handleAddAccount = useCallback(() => {
    onAddAccount();
    onClose();
  }, [onAddAccount, onClose]);

  return (
    <>
      {/* Main Wallet Switcher Dialog */}
      <BaseSheetDialog
        visible={visible}
        onClose={onClose}
        size="small"
        colorScheme="dialog"
        ariaLabelledBy="wallet-switcher-title"
      >
        <BaseSheetDialog.StandardHeader title={t('walletSwitcher.title', 'Your Wallets')} />

        <BaseSheetDialog.Content padding="none">
          <StyledList>
            {accounts.map((account) => (
              <AccountListItem
                key={account.id}
                account={account}
                isActive={account.id === activeAccountId}
                onSelect={() => handleSelectAccount(account.id)}
                onEdit={onEditAccount ? () => onEditAccount(account.id) : undefined}
                onDelete={onDeleteAccount ? () => handleDeleteRequest(account.id) : undefined}
              />
            ))}
          </StyledList>

          <Divider sx={{ borderColor: colors.border.default }} />

          <AddAccountButton
            startIcon={<PlusIcon />}
            onClick={handleAddAccount}
            data-testid="wallet-switcher-add-account"
          >
            {t('walletSwitcher.addAccount', 'Add New Account')}
          </AddAccountButton>
        </BaseSheetDialog.Content>
      </BaseSheetDialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={deleteConfirmAccountId !== null}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isDanger
        title={t('walletSwitcher.deleteConfirmTitle', 'Delete Account?')}
        message={t(
          'walletSwitcher.deleteConfirmMessage',
          'Are you sure you want to delete "{{name}}"? This action cannot be undone.',
          { name: accountToDelete?.name || '' }
        )}
        cancelText={t('common.cancel', 'Cancel')}
        confirmText={t('common.delete', 'Delete')}
        confirmTestID="wallet-switcher-delete-confirm"
      />
    </>
  );
}
