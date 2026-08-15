/**
 * AccountsPanel - Account management list for mobile
 *
 * Displays all user accounts with avatar, name, truncated address,
 * active indicator, and edit/delete actions. Includes an "Add Account"
 * button as the list footer.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import {
  colors,
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
          <Ionicons name="create-outline" size={20} color={colors.text.secondary} />
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
            <Ionicons name="trash-outline" size={20} color={colors.status.error} />
          </TouchableOpacity>
        )}

        {isActive && (
          <View style={styles.checkmarkContainer}>
            <Ionicons name="checkmark-circle" size={24} color={colors.status.success} />
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

  const handleDelete = useCallback(
    (accountId: string, accountName: string) => {
      Alert.alert(
        t('settings.wallets.delete_confirm_title'),
        t('settings.wallets.delete_confirm_message', { name: accountName }),
        [
          { text: t('actions.cancel'), style: 'cancel' },
          {
            text: t('actions.remove'),
            style: 'destructive',
            onPress: () => onDeleteAccount(accountId),
          },
        ]
      );
    },
    [onDeleteAccount, t]
  );

  const renderItem = useCallback(
    (item: Account) => (
      <AccountListItem
        account={item}
        isActive={item.id === activeAccountId}
        onPress={() => onSelectAccount(item.id)}
        onEdit={() => onEditAccount(item.id)}
        onDelete={() => handleDelete(item.id, item.name)}
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
          <Ionicons name="add" size={24} color={colors.text.primary} />
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
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  accountItemActive: {
    borderWidth: borderWidth.thin,
    borderColor: semantic.state.selectedEdge,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.tokenIcon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * lineHeight.none,
  },
  accountInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  accountName: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * lineHeight.normal,
  },
  accountAddress: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.normal,
    marginTop: spacing.xxs,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  checkmarkContainer: {
    width: 32,
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
    borderRadius: borderRadius.md,
  },
  addAccountIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.tokenIcon,
    backgroundColor: colors.background.card,
    borderWidth: borderWidth.thin,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAccountText: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * lineHeight.normal,
    marginLeft: spacing.md,
  },
});
