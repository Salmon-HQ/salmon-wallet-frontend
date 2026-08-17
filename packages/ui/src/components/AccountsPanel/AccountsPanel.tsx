/**
 * AccountsPanel - Account management list
 *
 * Displays all user accounts with avatar, name, truncated address,
 * active indicator, and edit/delete actions. Includes an "Add Account" button.
 */

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import { CheckCircleIcon, PencilSimpleIcon, PlusIcon, TrashIcon, iconSize } from '../../icons';
import { styled } from '../../utils/styled';
import {
  colors,
  spacing,
  borderRadius,
  borderWidth,
  componentSizes,
  fontSize,
  fontWeight,
  getAvatarColor,
  getShortAddress,
  getInitials,
  useAccountsContext,
  type Account,
} from '@salmon/shared';
import { getAccountAddress } from '@salmon/shared/utils/account';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { ConfirmDialog } from '../ConfirmDialog';
import type { AccountsPanelProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const AccountItem = styled(ListItemButton)<{ $isActive?: boolean }>(({ $isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.md,
  padding: `${spacing.md}px ${spacing.lg}px`,
  borderRadius: borderRadius.md,
  backgroundColor: $isActive ? colors.interactive.hoverSubtle : 'transparent',
  '&:hover': {
    backgroundColor: colors.background.tertiary,
  },
}));

const Avatar = styled(Box)({
  width: componentSizes.iconSize2XL,
  height: componentSizes.iconSize2XL,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

const AvatarImage = styled('img')({
  width: componentSizes.iconSize2XL,
  height: componentSizes.iconSize2XL,
  borderRadius: '50%',
  objectFit: 'cover',
});

const AccountInfo = styled(Box)({
  flex: 1,
  minWidth: 0,
});

const ActionButtons = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.xs,
});

const AddAccountButton = styled(ListItemButton)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.md,
  padding: `${spacing.md}px ${spacing.lg}px`,
  marginTop: spacing.sm,
});

const AddAccountIcon = styled(Box)({
  width: componentSizes.iconSize2XL,
  height: componentSizes.iconSize2XL,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.interactive.hoverSubtle,
  border: `${borderWidth.thin}px dashed ${colors.border.default}`,
});

// ============================================================================
// Component
// ============================================================================

export function AccountsPanel({
  onBack,
  onEditAccount,
  onAddAccount,
}: AccountsPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const [accountState, accountActions] = useAccountsContext();
  const { accounts, accountId } = accountState;
  const canDelete = accounts.length > 1;

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [deletingAccountName, setDeletingAccountName] = useState('');

  const handleSelectAccount = useCallback(
    (targetId: string) => {
      if (targetId !== accountId) {
        accountActions.changeAccount(targetId);
      }
    },
    [accountId, accountActions]
  );

  const handleDeleteClick = useCallback((account: Account) => {
    setDeletingAccountId(account.id);
    setDeletingAccountName(account.name);
    setDeleteDialogVisible(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deletingAccountId) {
      await accountActions.removeAccount(deletingAccountId);
    }
    setDeleteDialogVisible(false);
    setDeletingAccountId(null);
  }, [deletingAccountId, accountActions]);

  return (
    <SettingsPanelContent title={t('settings.accounts.title')} onBack={onBack}>
      <List disablePadding>
        {accounts.map((account) => {
          const isActive = account.id === accountId;
          const avatarColor = getAvatarColor(account.id);
          const initials = getInitials(account.name);
          const address = getAccountAddress(account);
          const truncated = getShortAddress(address);

          return (
            <AccountItem
              key={account.id}
              $isActive={isActive}
              onClick={() => handleSelectAccount(account.id)}
              data-testid={`account-item-${account.id}`}
            >
              {account.avatar ? (
                <AvatarImage src={account.avatar} alt={account.name} />
              ) : (
                <Avatar sx={{ backgroundColor: avatarColor }}>
                  <Typography
                    sx={{
                      color: colors.text.primary,
                      fontWeight: fontWeight.bold,
                      fontSize: fontSize.base,
                    }}
                  >
                    {initials}
                  </Typography>
                </Avatar>
              )}

              <AccountInfo>
                <Typography
                  noWrap
                  sx={{
                    color: colors.text.primary,
                    fontWeight: fontWeight.semibold,
                    fontSize: fontSize.base,
                  }}
                >
                  {account.name}
                </Typography>
                {truncated && (
                  <Typography
                    noWrap
                    sx={{
                      color: colors.text.secondary,
                      fontSize: fontSize.sm,
                    }}
                  >
                    {truncated}
                  </Typography>
                )}
              </AccountInfo>

              <ActionButtons>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditAccount(account.id);
                  }}
                  aria-label={t('actions.edit', 'Edit')}
                  data-testid={`account-edit-${account.id}`}
                  sx={{ color: colors.text.secondary }}
                >
                  <PencilSimpleIcon size={iconSize.md} />
                </IconButton>

                {canDelete && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(account);
                    }}
                    aria-label={t('actions.remove', 'Remove')}
                    data-testid={`account-remove-${account.id}`}
                    sx={{ color: colors.status.error }}
                  >
                    <TrashIcon size={iconSize.md} />
                  </IconButton>
                )}

                {isActive && <CheckCircleIcon color={colors.status.success} size={iconSize.lg} />}
              </ActionButtons>
            </AccountItem>
          );
        })}
      </List>

      <AddAccountButton onClick={onAddAccount} data-testid="account-add-button">
        <AddAccountIcon>
          <PlusIcon color={colors.text.primary} />
        </AddAccountIcon>
        <Typography
          sx={{
            color: colors.text.primary,
            fontWeight: fontWeight.semibold,
            fontSize: fontSize.base,
          }}
        >
          {t('settings.account_add.title')}
        </Typography>
      </AddAccountButton>

      <ConfirmDialog
        visible={deleteDialogVisible}
        onClose={() => setDeleteDialogVisible(false)}
        title={t('settings.wallets.delete_confirm_title')}
        message={t('settings.wallets.delete_confirm_message', { name: deletingAccountName })}
        confirmText={t('actions.remove')}
        isDanger
        onConfirm={confirmDelete}
      />
    </SettingsPanelContent>
  );
}
