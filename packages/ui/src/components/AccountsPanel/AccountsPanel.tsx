/**
 * AccountsPanel — account management list, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/AccountPanels/AccountsPanel`,
 * which mirrors the CORE 10 wallet row: a `Card` per account with an avatar
 * bubble, an inline rename pencil beside the name, the short address in
 * mono, a `WatchOnlyBadge` when it applies, and a trailing cluster of
 * delete + active-check. "Add account" closes the list as its own outlined
 * card, same idiom as Wallets' "Add wallet".
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  borderWidth,
  fontFamily,
  fontSize,
  fontWeight,
  getAccountAddress,
  getInitials,
  getShortAddress,
  isWatchOnlyAccount,
  spacing,
  type Account,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CheckCircleIcon, PencilSimpleIcon, PlusIcon, TrashIcon, iconSize } from '../../icons';
import { Card } from '../Card';
import { ConfirmDialog } from '../ConfirmDialog';
import { IconBubble } from '../IconBubble';
import { RowPress, StopPress } from '../ListRow';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { WatchOnlyBadge } from '../WatchOnlyBadge';
import type { AccountsPanelProps } from './types';

/** The avatar well every account row carries — the same size Wallets draws. */
const AVATAR_SIZE = 44;
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
  const tokens = useSemantic();
  const [imgError, setImgError] = useState(false);

  const address = getAccountAddress(account);
  const shortAddress = getShortAddress(address) ?? '';
  const initials = getInitials(account.name);

  return (
    <RowPress
      testID={`account-item-${account.id}`}
      onPress={onPress}
      current={isActive}
      accessibilityLabel={
        isActive
          ? t('accessibility.active_account', '{{name}}, active', { name: account.name })
          : account.name
      }
    >
      <Card
        padding="lg"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          ...(isActive ? { borderColor: tokens.accent.ink } : null),
        }}
      >
        <IconBubble size={AVATAR_SIZE} shape="circle" tone={isActive ? 'ink' : 'accent-tint'}>
          {account.avatar && !imgError ? (
            <img
              src={account.avatar}
              alt=""
              onError={() => setImgError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            />
          ) : (
            <span
              style={{
                color: tokens.text.primary,
                fontFamily: fontFamily.sans,
                fontWeight: fontWeight.bold,
                fontSize: fontSize.body,
              }}
            >
              {initials}
            </span>
          )}
        </IconBubble>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.xxs,
            textAlign: 'left',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                flexShrink: 1,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: tokens.text.primary,
                fontFamily: fontFamily.sans,
                fontWeight: fontWeight.bold,
                fontSize: fontSize.bodyLg,
              }}
            >
              {account.name}
            </span>
            <StopPress>
              <IconBubble
                testID={`account-edit-${account.id}`}
                size={ACTION_BUBBLE_SIZE}
                shape="circle"
                tone="surface"
                icon={PencilSimpleIcon}
                iconSize={13}
                onPress={onEdit}
                accessibilityLabel={t('accessibility.edit_account', 'Edit account')}
              />
            </StopPress>
            {isWatchOnlyAccount(account) && (
              <WatchOnlyBadge testID={`account-item-watch-only-${account.id}`} />
            )}
          </div>
          {shortAddress ? (
            <span
              style={{
                color: tokens.text.secondary,
                // An address is position-critical, so it reads in mono at the mono step.
                fontFamily: fontFamily.mono,
                fontSize: fontSize.mono,
              }}
            >
              {shortAddress}
            </span>
          ) : null}
        </div>

        <div
          style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
        >
          {canDelete && (
            <StopPress>
              <IconBubble
                testID={`account-remove-${account.id}`}
                size={ACTION_BUBBLE_SIZE}
                tone="ghost"
                icon={TrashIcon}
                iconSize={iconSize.sm}
                iconColor={tokens.status.danger}
                onPress={onDelete}
                accessibilityLabel={t('accessibility.delete_account', 'Delete account')}
              />
            </StopPress>
          )}
          {isActive && (
            // Selection is salmon, not green: green is a status ink (an
            // outcome), and a selected row is not an outcome.
            <IconBubble
              size={ACTION_BUBBLE_SIZE}
              tone="ghost"
              icon={CheckCircleIcon}
              iconSize={iconSize.lg}
              iconColor={tokens.accent.ink}
            />
          )}
        </div>
      </Card>
    </RowPress>
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
  const tokens = useSemantic();
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
    [accounts, activeAccountId, canDelete, onSelectAccount, onEditAccount]
  );

  return (
    <SettingsPanelContent
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
        style={{
          backgroundColor: 'transparent',
          borderStyle: 'dashed',
          borderWidth: borderWidth.thin,
          borderColor: tokens.border.raised,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
        }}
      >
        <PlusIcon size={iconSize.md} color={tokens.accent.ink} />
        <span
          style={{
            color: tokens.accent.ink,
            fontFamily: fontFamily.sans,
            fontWeight: fontWeight.bold,
            fontSize: fontSize.body,
          }}
        >
          {t('settings.account_add.title')}
        </span>
      </Card>

      <ConfirmDialog
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
    </SettingsPanelContent>
  );
}
