/**
 * WalletSwitcherSheet - Account selection content rendered inside the
 * GateContainer expanded state. Lists accounts (avatar, name, truncated
 * address), highlights the active one, and exposes an add-account action.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Animated,
  type ListRenderItemInfo,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckCircleIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  WalletIcon,
  iconSize,
} from '../../icons';
import { useTranslation } from 'react-i18next';
import { usePanelNavigation } from '../PanelHost';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  lineHeight,
  componentSizes,
  getAvatarColor,
  type Account,
  getShortAddress,
  getInitials,
  getAccountAddress,
  fontFamilyNative,
  borderWidth,
  opacity,
  semantic,
} from '@salmon/shared';

import type { WalletSwitcherSheetProps, AccountListItemProps } from './types';

// ============================================================================
// Constants
// ============================================================================

// ============================================================================
// AccountListItem Component
// ============================================================================

/**
 * Individual account item in the list
 */
function AccountListItem({
  account,
  isActive,
  onPress,
  onEdit,
  onDelete,
  canDelete,
}: AccountListItemProps): React.ReactElement {
  const { t } = useTranslation();
  const avatarColor = useMemo(() => getAvatarColor(account.id), [account.id]);
  const initials = useMemo(() => getInitials(account.name), [account.name]);
  const address = useMemo(() => getAccountAddress(account), [account]);
  const truncatedAddress = useMemo(() => getShortAddress(address), [address]);
  const [imgError, setImgError] = useState(false);

  return (
    <TouchableOpacity
      testID={`wallet-switcher-account-${account.id}`}
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
        {/* Edit Button */}
        {onEdit && (
          <TouchableOpacity
            testID={`wallet-switcher-edit-${account.id}`}
            style={styles.actionButton}
            onPress={onEdit}
            activeOpacity={0.7}
            accessibilityLabel={t('accessibility.edit_account')}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <PencilSimpleIcon size={iconSize.md} color={colors.text.secondary} />
          </TouchableOpacity>
        )}

        {/* Delete Button */}
        {onDelete && (
          <TouchableOpacity
            testID={`wallet-switcher-delete-${account.id}`}
            style={[styles.actionButton, !canDelete && styles.actionButtonDisabled]}
            onPress={canDelete ? onDelete : undefined}
            activeOpacity={canDelete ? 0.7 : 1}
            accessibilityLabel={t('accessibility.delete_account')}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canDelete }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            disabled={!canDelete}
          >
            <TrashIcon
              size={iconSize.md}
              color={canDelete ? semantic.status.danger : semantic.text.disabled}
            />
          </TouchableOpacity>
        )}

        {/* Active Indicator */}
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
// WalletSwitcherSheet Component
// ============================================================================

export function WalletSwitcherSheet({
  visible: _visible,
  onClose,
  accounts,
  activeAccountId,
  onSelectAccount,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
}: WalletSwitcherSheetProps): React.ReactElement {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const panelNavigation = usePanelNavigation();

  // Top fade gradient opacity
  const topFadeOpacity = useMemo(() => new Animated.Value(0), []);

  // Handle scroll to show/hide top fade gradient dynamically
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const opacity = Math.min(offsetY / componentSizes.sheetFadeGradientHeight, 1);
      topFadeOpacity.setValue(opacity);
    },
    [topFadeOpacity]
  );

  // Determine if delete should be allowed (can't delete last account)
  const canDeleteAccounts = accounts.length > 1;

  /**
   * Handle account selection
   * Closes the sheet after selecting a different account
   */
  const handleSelectAccount = useCallback(
    async (accountId: string) => {
      if (accountId !== activeAccountId) {
        await onSelectAccount(accountId);
      }
      onClose();
    },
    [activeAccountId, onSelectAccount, onClose]
  );

  /**
   * Handle add account button press
   */
  const handleAddAccount = useCallback(() => {
    // In place, on the surface the user is already on. This used to close the
    // switcher and open settings, which answered "add an account" by showing
    // an unrelated screen. `onAddAccount` remains the fallback for a surface
    // that mounts the switcher without a panel host.
    if (panelNavigation) {
      panelNavigation.push('account-add');
      return;
    }
    onClose();
    onAddAccount();
  }, [panelNavigation, onClose, onAddAccount]);

  /**
   * Handle edit account button press
   */
  const handleEditAccount = useCallback(
    (accountId: string) => {
      if (panelNavigation) {
        panelNavigation.push('account-edit', { accountId });
        return;
      }
      onClose();
      onEditAccount?.(accountId);
    },
    [panelNavigation, onClose, onEditAccount]
  );

  /**
   * Handle delete account button press
   * Shows confirmation alert before deleting
   */
  const handleDeleteAccount = useCallback(
    (accountId: string, accountName: string) => {
      if (!canDeleteAccounts) {
        Alert.alert(t('settings.wallets.delete_account'), t('settings.wallets.cannot_delete_last'));
        return;
      }

      Alert.alert(
        t('settings.wallets.delete_confirm_title'),
        t('settings.wallets.delete_confirm_message', { name: accountName }),
        [
          {
            text: t('actions.cancel'),
            style: 'cancel',
          },
          {
            text: t('actions.remove'),
            style: 'destructive',
            onPress: () => {
              onClose();
              onDeleteAccount?.(accountId);
            },
          },
        ]
      );
    },
    [canDeleteAccounts, onClose, onDeleteAccount, t]
  );

  /**
   * Render individual account item
   */
  const renderAccountItem = useCallback(
    ({ item }: ListRenderItemInfo<Account>) => (
      <AccountListItem
        account={item}
        isActive={item.id === activeAccountId}
        onPress={() => handleSelectAccount(item.id)}
        onEdit={onEditAccount ? () => handleEditAccount(item.id) : undefined}
        onDelete={onDeleteAccount ? () => handleDeleteAccount(item.id, item.name) : undefined}
        canDelete={canDeleteAccounts}
      />
    ),
    [
      activeAccountId,
      handleSelectAccount,
      handleEditAccount,
      handleDeleteAccount,
      onEditAccount,
      onDeleteAccount,
      canDeleteAccounts,
    ]
  );

  /**
   * Key extractor for FlatList
   */
  const keyExtractor = useCallback((item: Account) => item.id, []);

  /**
   * List footer with Add Account button
   */
  const ListFooter = useMemo(
    () => (
      <TouchableOpacity
        testID="wallet-switcher-add-account"
        style={styles.addAccountButton}
        onPress={handleAddAccount}
        activeOpacity={0.7}
        accessibilityLabel={t('settings.wallets.add_new_wallet')}
        accessibilityRole="button"
      >
        <View style={styles.addAccountIcon}>
          <PlusIcon size={iconSize.lg} color={colors.text.primary} />
        </View>
        <Text style={styles.addAccountText}>{t('settings.wallets.add_new_wallet')}</Text>
      </TouchableOpacity>
    ),
    [handleAddAccount, t]
  );

  /**
   * Empty state when no accounts exist
   */
  const ListEmpty = useMemo(
    () => (
      <View style={styles.emptyState}>
        <WalletIcon size={48} color={colors.text.secondary} />
        <Text style={styles.emptyStateText}>{t('settings.wallets.your_wallets')}</Text>
      </View>
    ),
    [t]
  );

  return (
    <View style={styles.listWrapper}>
      <FlatList
        data={accounts}
        renderItem={renderAccountItem}
        keyExtractor={keyExtractor}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: spacing.md + insets.top + componentSizes.headerHeight },
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {/* Top fade gradient */}
      <Animated.View
        style={[styles.topFadeGradient, { opacity: topFadeOpacity }]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[colors.background.primary, 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  listWrapper: {
    flex: 1,
  },
  topFadeGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: componentSizes.sheetFadeGradientHeight,
    zIndex: 1,
  },
  listContent: {
    paddingBottom: spacing.md,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'transparent',
  },
  accountItemActive: {
    backgroundColor: colors.background.card,
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
    fontSize: fontSize.bodyLg,
    lineHeight: fontSize.bodyLg * lineHeight.none,
  },
  accountInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  accountName: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.bodyLg,
    lineHeight: fontSize.bodyLg * lineHeight.normal,
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
  actionButtonDisabled: {
    opacity: opacity.disabled,
  },
  checkmarkContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.default,
    marginHorizontal: spacing.lg,
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
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
    fontSize: fontSize.bodyLg,
    lineHeight: fontSize.bodyLg * lineHeight.normal,
    marginLeft: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyStateText: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.bodyLg,
    lineHeight: fontSize.bodyLg * lineHeight.normal,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default WalletSwitcherSheet;
