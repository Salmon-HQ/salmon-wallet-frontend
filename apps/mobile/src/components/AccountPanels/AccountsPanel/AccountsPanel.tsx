/**
 * AccountsPanel - Account management list for mobile
 *
 * Displays all user accounts with avatar, name, truncated address,
 * active indicator, and edit/delete actions. Includes an "Add Account"
 * button as the list footer.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { CheckCircleIcon, PencilSimpleIcon, PlusIcon, TrashIcon, iconSize } from '../../../icons';
import { useTranslation } from 'react-i18next';

import {
  colors,
  componentSizes,
  spacing,
  borderRadius,
  borderWidth,
  fontSize,
  lineHeight,
  fontFamilyNative,
  getAvatarColor,
  getShortAddress,
  getInitials,
  getAccountAddress,
  type Account,
  semantic,
} from '@salmon/shared';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { ConfirmSheet } from '../../ConfirmSheet';
import type { AccountsPanelProps } from './types';

// ============================================================================
// AccountListItem
// ============================================================================

function AccountListItem({
  account,
  isActive,
  onPress,
  onEdit,
  onDelete,
  canDelete,
}: {
  account: Account;
  isActive: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { t } = useTranslation();
  const avatarColor = useMemo(() => getAvatarColor(account.id), [account.id]);
  const initials = useMemo(() => getInitials(account.name), [account.name]);
  const address = useMemo(() => getAccountAddress(account), [account]);
  const truncatedAddress = useMemo(() => getShortAddress(address), [address]);
  const [imgError, setImgError] = useState(false);

  return (
    <TouchableOpacity
      testID={`account-item-${account.id}`}
      style={[styles.accountItem, isActive && styles.accountItemActive]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={
        isActive
          ? t('accessibility.active_account', '{{name}}, active', { name: account.name })
          : account.name
      }
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      {/* Avatar */}
      {account.avatar && !imgError ? (
        <Image
          source={{ uri: account.avatar }}
          style={styles.avatar}
          contentFit="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      )}

      {/* Account Info */}
      <View style={styles.accountInfo}>
        <Text style={styles.accountName} numberOfLines={1}>
          {account.name}
        </Text>
        {truncatedAddress ? (
          <Text style={styles.accountAddress} numberOfLines={1}>
            {truncatedAddress}
          </Text>
        ) : null}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          testID={`account-edit-${account.id}`}
          style={styles.actionButton}
          onPress={onEdit}
          activeOpacity={0.7}
          accessibilityLabel={t('accessibility.edit_account', 'Edit account')}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <PencilSimpleIcon size={iconSize.md} color={semantic.text.secondary} />
        </TouchableOpacity>

        {canDelete && (
          <TouchableOpacity
            testID={`account-remove-${account.id}`}
            style={styles.actionButton}
            onPress={onDelete}
            activeOpacity={0.7}
            accessibilityLabel={t('accessibility.delete_account', 'Delete account')}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <TrashIcon size={iconSize.md} color={semantic.status.danger} />
          </TouchableOpacity>
        )}

        {isActive && (
          <View style={styles.checkmarkContainer}>
            <CheckCircleIcon size={iconSize.lg} color={semantic.status.success} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// AccountsPanel
// ============================================================================

export function AccountsPanel({
  accounts,
  activeAccountId,
  onSelectAccount,
  onEditAccount,
  onDeleteAccount,
  onAddAccount,
  onBack,
}: AccountsPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const canDelete = accounts.length > 1;
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  const handleDelete = useCallback((account: Account) => {
    setAccountToDelete(account);
  }, []);

  const handleDeleteConfirmed = useCallback(async () => {
    if (!accountToDelete) return;
    await onDeleteAccount(accountToDelete.id);
  }, [accountToDelete, onDeleteAccount]);

  const renderItem = useCallback(
    (item: Account) => (
      <AccountListItem
        account={item}
        isActive={item.id === activeAccountId}
        onPress={() => onSelectAccount(item.id)}
        onEdit={() => onEditAccount(item.id)}
        onDelete={() => handleDelete(item)}
        canDelete={canDelete}
      />
    ),
    [activeAccountId, onSelectAccount, onEditAccount, handleDelete, canDelete]
  );

  const ListFooter = useMemo(
    () => (
      <TouchableOpacity
        testID="account-add-button"
        style={styles.addAccountButton}
        onPress={onAddAccount}
        activeOpacity={0.7}
        accessibilityLabel={t('settings.accounts.title')}
        accessibilityRole="button"
      >
        <View style={styles.addAccountIcon}>
          <PlusIcon size={iconSize.lg} color={semantic.text.primary} />
        </View>
        <Text style={styles.addAccountText}>{t('settings.account_add.title')}</Text>
      </TouchableOpacity>
    ),
    [onAddAccount, t]
  );

  return (
    <SettingsScreenLayout title={t('settings.accounts.title')} onBack={onBack} scrollable={false}>
      <View>
        {accounts.map((account) => (
          <React.Fragment key={account.id}>{renderItem(account)}</React.Fragment>
        ))}
        {ListFooter}
      </View>

      <ConfirmSheet
        visible={accountToDelete !== null}
        onClose={() => setAccountToDelete(null)}
        title={t('settings.wallets.delete_confirm_title')}
        message={t('settings.wallets.delete_confirm_message', {
          name: accountToDelete?.name ?? '',
        })}
        confirmText={t('actions.remove')}
        isDanger
        onConfirm={handleDeleteConfirmed}
      />
    </SettingsScreenLayout>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    // Control Radius Rule: a settings list row is a control — r3, not r2.
    borderRadius: borderRadius.r3,
    marginBottom: spacing.sm,
  },
  accountItemActive: {
    borderWidth: borderWidth.thin,
    borderColor: semantic.state.selectedEdge,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize.bodyLg,
    lineHeight: fontSize.bodyLg * lineHeight.none,
  },
  accountInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  accountName: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.bodyLg,
    lineHeight: fontSize.bodyLg * lineHeight.normal,
  },
  accountAddress: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.caption,
    lineHeight: fontSize.caption * lineHeight.normal,
    marginTop: spacing.xxs,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButton: {
    width: componentSizes.iconSizeLarge,
    height: componentSizes.iconSizeLarge,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.r1,
  },
  checkmarkContainer: {
    width: componentSizes.iconSizeLarge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    // Control Radius Rule: a settings list row is a control — r3, not r2.
    borderRadius: borderRadius.r3,
  },
  addAccountIcon: {
    width: 44,
    height: 44,
    // Sits in the avatar slot, so it shares the avatar's `full` radius.
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.card,
    borderWidth: borderWidth.thin,
    borderColor: semantic.border.default,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAccountText: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.bodyLg,
    lineHeight: fontSize.bodyLg * lineHeight.normal,
    marginLeft: spacing.md,
  },
});
