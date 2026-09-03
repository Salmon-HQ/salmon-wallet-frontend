/**
 * AccountsPanel - account management list for mobile.
 *
 * Mirrors the CORE 10 wallet row (`app/(app)/wallets.tsx`): a `Card` per
 * account with an avatar bubble, an inline rename pencil beside the name, the
 * short address in mono, a `WatchOnlyBadge` when it applies, and a trailing
 * cluster of delete + active-check. "Add account" closes the list as its own
 * outlined card, same idiom as Wallets' "Add wallet".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  fontFamilyNative,
  fontSize,
  fontWeight,
  getAccountAddress,
  getShortAddress,
  isWatchOnlyAccount,
  s,
  spacing,
  vs,
  type Account,
  type Semantic,
} from '@salmon/shared';
import { CheckCircleIcon, PencilSimpleIcon, PlusIcon, TrashIcon, iconSize } from '../../../icons';
import { Card } from '../../Card';
import { AccountAvatar } from '../../AccountAvatar';
import { IconBubble } from '../../IconBubble';
import { WatchOnlyBadge } from '../../WatchOnlyBadge';
import { SettingsScreenLayout } from '../../SettingsScreenLayout';
import { ConfirmSheet } from '../../ConfirmSheet';
import { useSemantic, useThemedStyles } from '../../../theme/useThemedStyles';
import type { AccountsPanelProps } from './types';

/** The inline rename and trailing action affordances. */
const ACTION_BUBBLE_SIZE = 24;

// ============================================================================
// AccountRow
// ============================================================================

interface AccountRowProps {
  account: Account;
  isActive: boolean;
  canDelete: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function AccountRow({ account, isActive, canDelete, onPress, onEdit, onDelete }: AccountRowProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { status, accent } = useSemantic();
  const address = getAccountAddress(account);
  const shortAddress = getShortAddress(address) ?? '';

  return (
    <Card
      testID={`account-item-${account.id}`}
      padding="lg"
      onPress={onPress}
      accessibilityLabel={
        isActive
          ? t('accessibility.active_account', '{{name}}, active', { name: account.name })
          : account.name
      }
      style={isActive ? styles.activeCard : undefined}
    >
      <View style={styles.row}>
        <AccountAvatar name={account.name} avatarUrl={account.avatar} active={isActive} />

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
              {account.name}
            </Text>
            <IconBubble
              testID={`account-edit-${account.id}`}
              size={ACTION_BUBBLE_SIZE}
              shape="circle"
              tone="surface"
              icon={PencilSimpleIcon}
              iconSize={13}
              onPress={onEdit}
              accessibilityLabel={t('accessibility.edit_account', 'Edit account')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            />
            {isWatchOnlyAccount(account) && (
              <WatchOnlyBadge testID={`account-item-watch-only-${account.id}`} />
            )}
          </View>
          {shortAddress ? <Text style={styles.address}>{shortAddress}</Text> : null}
        </View>

        <View style={styles.trailing}>
          {canDelete && (
            <IconBubble
              testID={`account-remove-${account.id}`}
              size={ACTION_BUBBLE_SIZE}
              tone="ghost"
              icon={TrashIcon}
              iconSize={iconSize.sm}
              iconColor={status.danger}
              onPress={onDelete}
              accessibilityLabel={t('accessibility.delete_account', 'Delete account')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            />
          )}
          {isActive && (
            // Selection is salmon, not green: green is a status ink (an
            // outcome), and a selected row is not an outcome.
            <IconBubble
              size={ACTION_BUBBLE_SIZE}
              tone="ghost"
              icon={CheckCircleIcon}
              iconSize={iconSize.lg}
              iconColor={accent.ink}
            />
          )}
        </View>
      </View>
    </Card>
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
  const styles = useThemedStyles(stylesFor);
  const { accent } = useSemantic();
  const canDelete = accounts.length > 1;
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  const handleDeleteConfirmed = useCallback(async () => {
    if (!accountToDelete) return;
    await onDeleteAccount(accountToDelete.id);
  }, [accountToDelete, onDeleteAccount]);

  const rows = useMemo(
    () =>
      accounts.map((account) => (
        <AccountRow
          key={account.id}
          account={account}
          isActive={account.id === activeAccountId}
          canDelete={canDelete}
          onPress={() => onSelectAccount(account.id)}
          onEdit={() => onEditAccount(account.id)}
          onDelete={() => setAccountToDelete(account)}
        />
      )),
    [accounts, activeAccountId, canDelete, onEditAccount, onSelectAccount]
  );

  return (
    <SettingsScreenLayout
      title={t('settings.accounts.title')}
      subtitle={t('settings.accounts.subtitle', 'Switch between or manage your accounts.')}
      onBack={onBack}
    >
      {rows}

      {/* The one action that is not an account: outlined, so it reads as an
          empty slot rather than a card with nothing in it — same idiom as
          Wallets' "Add wallet". */}
      <Card
        testID="account-add-button"
        padding="lg"
        onPress={onAddAccount}
        accessibilityLabel={t('settings.account_add.title')}
        style={styles.addCard}
      >
        <View style={styles.addRow}>
          <PlusIcon size={iconSize.md} color={accent.ink} />
          <Text style={styles.addLabel}>{t('settings.account_add.title')}</Text>
        </View>
      </Card>

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

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    activeCard: {
      borderWidth: 1,
      borderColor: t.accent.ink,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.md),
    },
    info: {
      flex: 1,
      minWidth: 0,
      gap: vs(spacing.xxs),
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.sm),
      flexWrap: 'wrap',
    },
    name: {
      flexShrink: 1,
      color: t.text.primary,
      fontFamily: fontFamilyNative.bold,
      fontWeight: fontWeight.bold,
      fontSize: s(fontSize.bodyLg),
    },
    address: {
      color: t.text.secondary,
      // An address is position-critical, so it reads in mono at the mono step.
      fontFamily: fontFamilyNative.mono,
      fontSize: s(fontSize.mono),
    },
    trailing: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.xs),
    },
    addCard: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.border.raised,
    },
    addRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s(spacing.sm),
    },
    addLabel: {
      color: t.accent.ink,
      fontFamily: fontFamilyNative.bold,
      fontWeight: fontWeight.bold,
      fontSize: s(fontSize.body),
    },
  });
