/**
 * WalletsScreen — CORE 10 · Wallets, on the DOM.
 *
 * The mobile twin is the route `apps/mobile/app/(app)/wallets.tsx`. The
 * switcher was a sheet; it is a screen now, because the second tap inside
 * it changes what it is (rename, include, add, rescan). Aggregated balance
 * on top, one card per wallet under an "Include in total" heading, and an
 * outlined "Add wallet" that opens the same add flow Settings → Accounts →
 * Add opens.
 *
 * The cards of one seed sit together: a wallet, then the wallets derived
 * from it, joined by a hairline descent and "Derived from {name}" as the
 * derived card's subtitle (spec 025). No index ever appears.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  borderWidth,
  fontFamily,
  fontSize,
  fontWeight,
  getAccountAddress,
  getAccountMnemonic,
  getShortAddress,
  isWatchOnlyAccount,
  letterSpacing,
  spacing,
  sumIncludedTotals,
  tabularNums,
  useAccountsContext,
  useBalance,
  useCurrencyContext,
  useUserConfig,
  useWalletTotals,
  type Account,
  type NetworkId,
  orderWalletCards,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import {
  CheckCircleIcon,
  CircleIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSimpleIcon,
  PlusIcon,
  TreeStructureIcon,
  iconSize,
} from '../../icons';
import { AccountAvatar } from '../AccountAvatar';
import { Card } from '../Card';
import { Chip } from '../Chip';
import { ConfirmDialog } from '../ConfirmDialog';
import { IconBubble } from '../IconBubble';
import { RowPress, StopPress } from '../ListRow';
import { SectionLabel } from '../SectionLabel';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { WatchOnlyBadge } from '../WatchOnlyBadge';
import type { WalletsScreenProps } from './types';

/** The inline rename affordance beside the name. */
const RENAME_BUBBLE_SIZE = 24;
/** The include control at the end of a wallet card. */
const INCLUDE_ICON_SIZE = 22;

const HIDDEN_VALUE = '••••';

export function WalletsScreen({
  onBack,
  onRename,
  onAddWallet,
  onRescan,
  scanningAccountId = null,
  showUnverifiedTokens = false,
  style,
  className,
  testID = 'wallets-screen',
}: WalletsScreenProps): React.ReactElement {
  const { t } = useTranslation();
  const tokens = useSemantic();

  const [accountState, accountActions] = useAccountsContext();
  const { accounts, accountId, activeBlockchainAccount, networkId } = accountState;
  const [, { formatValue }] = useCurrencyContext();

  const userConfigAccount = useMemo(
    () => ({
      network: {
        environment: (activeBlockchainAccount
          ? networkId || 'solana-mainnet'
          : 'solana-mainnet') as 'solana-mainnet' | 'solana-devnet',
        blockchain: 'solana',
      },
    }),
    [activeBlockchainAccount, networkId]
  );
  const { excludedFromTotal, setIncludedInTotal } = useUserConfig({
    activeBlockchainAccount: userConfigAccount,
  });

  // The eye is the app's one balance-visibility preference, not a second one
  // for this screen: `useBalance` owns it and persists it. Skipped, so
  // mounting this screen costs no request — only the preference comes back.
  const { hiddenBalance, toggleHidden } = useBalance({
    account: activeBlockchainAccount,
    networkId: (networkId ?? undefined) as NetworkId | undefined,
    skip: true,
  });

  const { totals } = useWalletTotals({
    accounts,
    networkId: (networkId ?? undefined) as NetworkId | undefined,
    includeSpam: showUnverifiedTokens,
  });

  const isIncluded = useCallback(
    (walletId: string) => !excludedFromTotal.includes(walletId),
    [excludedFromTotal]
  );

  const includedCount = accounts.filter((a) => isIncluded(a.id)).length;

  const ordered = useMemo(() => orderWalletCards(accounts), [accounts]);

  const aggregated = useMemo(
    () =>
      sumIncludedTotals(
        accounts.map((a) => a.id),
        excludedFromTotal,
        totals
      ),
    [accounts, excludedFromTotal, totals]
  );

  const [keepOneNotice, setKeepOneNotice] = useState(false);

  const handleSelect = useCallback(
    async (id: string) => {
      if (id !== accountId) await accountActions.changeAccount(id);
      onBack();
    },
    [accountId, accountActions, onBack]
  );

  const handleToggleInclude = useCallback(
    (walletId: string) => {
      const included = isIncluded(walletId);
      // The total can never be empty: excluding the last included wallet would
      // leave the card reading a number that belongs to nothing.
      if (included && includedCount <= 1) {
        setKeepOneNotice(true);
        return;
      }
      void setIncludedInTotal(walletId, !included);
    },
    [includedCount, isIncluded, setIncludedInTotal]
  );

  return (
    <SettingsPanelContent
      testID={testID}
      title={t('settings.wallets.screen_title')}
      subtitle={t('settings.wallets.screen_subtitle')}
      onBack={onBack}
      style={style}
      className={className}
    >
      {/* The aggregated total. Ink, because it is a different object from the
          wallet cards under it, not a louder one. */}
      <Card
        testID="wallets-total-card"
        tone="ink"
        padding="lg"
        gap={spacing.xs}
        style={{ flexDirection: 'column' }}
      >
        <div
          style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
        >
          <span
            style={{
              flex: 1,
              color: tokens.text.secondary,
              fontFamily: fontFamily.sans,
              fontWeight: fontWeight.semibold,
              fontSize: fontSize.caption,
            }}
          >
            {t('settings.wallets.total_title')}
          </span>
          <IconBubble
            testID="wallets-balance-eye"
            size={24}
            tone="ghost"
            icon={hiddenBalance ? EyeSlashIcon : EyeIcon}
            iconSize={iconSize.sm}
            onPress={toggleHidden}
            accessibilityLabel={
              hiddenBalance
                ? t('accessibility.show_balance', 'Show balance')
                : t('accessibility.hide_balance', 'Hide balance')
            }
          />
        </div>
        <span
          data-testid="wallets-total-value"
          style={{
            ...tabularNums.css,
            color: tokens.text.primary,
            fontFamily: fontFamily.sans,
            fontWeight: fontWeight.bold,
            fontSize: fontSize.display,
            letterSpacing: letterSpacing.balance,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {hiddenBalance ? HIDDEN_VALUE : formatValue(aggregated)}
        </span>
        <span
          data-testid="wallets-included-count"
          style={{
            color: tokens.text.tertiary,
            fontFamily: fontFamily.sans,
            fontWeight: fontWeight.medium,
            fontSize: fontSize.micro,
          }}
        >
          {t('settings.wallets.included_count', {
            included: includedCount,
            total: accounts.length,
          })}
        </span>
      </Card>

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <SectionLabel variant="caps">{t('settings.wallets.include_in_total')}</SectionLabel>
        <span
          style={{
            color: tokens.text.tertiary,
            fontFamily: fontFamily.sans,
            fontWeight: fontWeight.semibold,
            fontSize: fontSize.micro,
          }}
        >
          {t('settings.wallets.include_hint')}
        </span>
      </div>

      {ordered.map(({ account, parentName }) => (
        <WalletCard
          key={account.id}
          account={account}
          parentName={parentName}
          isActive={account.id === accountId}
          included={isIncluded(account.id)}
          total={totals[account.id]}
          hiddenBalance={hiddenBalance}
          formatValue={formatValue}
          networkId={(networkId ?? undefined) as NetworkId | undefined}
          scanning={scanningAccountId !== null}
          onSelect={() => void handleSelect(account.id)}
          onRename={() => onRename(account.id)}
          onRescan={onRescan ? () => onRescan(account.id) : undefined}
          onToggleInclude={() => handleToggleInclude(account.id)}
        />
      ))}

      {/* The one action that is not a wallet: outlined, so it reads as an
          empty slot rather than a card with nothing in it. */}
      <Card
        testID="wallets-add-wallet"
        padding="lg"
        onPress={onAddWallet}
        accessibilityLabel={t('settings.wallets.add_wallet')}
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
          {t('settings.wallets.add_wallet')}
        </span>
      </Card>

      <ConfirmDialog
        visible={keepOneNotice}
        onClose={() => setKeepOneNotice(false)}
        title={t('settings.wallets.total_title', 'Total balance')}
        message={t('settings.wallets.keep_one_included')}
        acknowledgeOnly
        confirmText={t('actions.close')}
        onConfirm={() => {}}
        confirmTestID="wallets-keep-one-close"
      />
    </SettingsPanelContent>
  );
}

// ============================================================================
// One wallet
// ============================================================================

interface WalletCardProps {
  account: Account;
  /** The wallet this one was derived from, when it descends from one. */
  parentName: string | undefined;
  isActive: boolean;
  included: boolean;
  total: number | undefined;
  hiddenBalance: boolean;
  formatValue: (value: number | undefined) => string;
  networkId: NetworkId | undefined;
  scanning: boolean;
  onSelect: () => void;
  onRename: () => void;
  onRescan?: () => void;
  onToggleInclude: () => void;
}

function WalletCard({
  account,
  parentName,
  isActive,
  included,
  total,
  hiddenBalance,
  formatValue,
  networkId,
  scanning,
  onSelect,
  onRename,
  onRescan,
  onToggleInclude,
}: WalletCardProps): React.ReactElement {
  const { t } = useTranslation();
  const tokens = useSemantic();
  const [{ accountId: activeId, pathIndex }, accountActions] = useAccountsContext();

  const address = getAccountAddress(account);
  const shortAddress = getShortAddress(address) ?? '';
  // Only a seed has a derivation tree to look through — an imported key or a
  // watched address has nothing to find, so the action is absent rather than
  // present and inert.
  const canRescan = !!onRescan && !!getAccountMnemonic(account);

  // The derived accounts this wallet holds on the chain being read. Null
  // slots are holes in the derivation tree, not accounts.
  const derived = useMemo(() => {
    const list = networkId ? account.networksAccounts?.[networkId] : undefined;
    const held = (list ?? []).flatMap((blockchainAccount, index) =>
      blockchainAccount ? [{ index, address: blockchainAccount.getReceiveAddress?.() ?? '' }] : []
    );
    return held.length < 2 ? [] : held;
  }, [account.networksAccounts, networkId]);

  return (
    // A wallet derived from another one is indented under it and joined to it
    // by a hairline descent running up through the gap to the card it came
    // from — it is a wallet of its own, and this is the only thing that says
    // where it came from (spec 025).
    <div style={{ position: 'relative', paddingLeft: parentName ? spacing.screenGutter : 0 }}>
      {parentName && (
        <span
          data-testid={`wallet-descent-${account.id}`}
          aria-hidden
          style={{
            position: 'absolute',
            left: spacing.screenGutter / 2,
            top: -spacing.screenGutter,
            bottom: 0,
            width: borderWidth.thin,
            backgroundColor: tokens.border.default,
          }}
        />
      )}
      <RowPress
        testID={`wallet-card-${account.id}`}
        onPress={onSelect}
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
          <AccountAvatar name={account.name} avatarUrl={account.avatar} active={isActive} />

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
              <StopPress style={{ gap: spacing.sm }}>
                {canRescan && (
                  <IconBubble
                    testID={`wallet-rescan-${account.id}`}
                    size={RENAME_BUBBLE_SIZE}
                    shape="circle"
                    tone="surface"
                    icon={TreeStructureIcon}
                    iconSize={13}
                    onPress={onRescan}
                    disabled={scanning}
                    accessibilityLabel={t('settings.wallets.find_derived')}
                  />
                )}
                <IconBubble
                  testID={`wallet-rename-${account.id}`}
                  size={RENAME_BUBBLE_SIZE}
                  shape="circle"
                  tone="surface"
                  icon={PencilSimpleIcon}
                  iconSize={13}
                  onPress={onRename}
                  accessibilityLabel={t('accessibility.edit_account')}
                />
              </StopPress>
              {isWatchOnlyAccount(account) && (
                <WatchOnlyBadge testID={`wallet-watch-only-${account.id}`} />
              )}
            </div>
            <span
              data-testid={`wallet-balance-${account.id}`}
              style={{
                ...tabularNums.css,
                color: tokens.text.secondary,
                fontFamily: fontFamily.sans,
                fontWeight: fontWeight.medium,
                fontSize: fontSize.body,
              }}
            >
              {hiddenBalance ? HIDDEN_VALUE : formatValue(total)}
              {shortAddress ? ` · ${shortAddress}` : ''}
            </span>
            {parentName && (
              <span
                data-testid={`wallet-derived-from-${account.id}`}
                style={{
                  color: tokens.text.tertiary,
                  fontFamily: fontFamily.sans,
                  fontWeight: fontWeight.medium,
                  fontSize: fontSize.micro,
                }}
              >
                {t('settings.wallets.derived_from', { name: parentName })}
              </span>
            )}
          </div>

          <StopPress>
            <IconBubble
              testID={`wallet-include-${account.id}`}
              size={24}
              tone="ghost"
              icon={included ? CheckCircleIcon : CircleIcon}
              iconSize={INCLUDE_ICON_SIZE}
              iconColor={included ? tokens.accent.ink : tokens.text.tertiary}
              onPress={onToggleInclude}
              accessibilityLabel={
                included
                  ? t('settings.wallets.exclude_from_total_a11y', { name: account.name })
                  : t('settings.wallets.include_in_total_a11y', { name: account.name })
              }
            />
          </StopPress>
        </Card>
      </RowPress>

      {/* The derived paths this wallet holds on the chain being read — the
          chips mobile's `SubAccountSelector` draws: a derived account is a
          filter over one wallet, which is what `Chip`'s `filter` variant says. */}
      {derived.length > 0 && (
        <div
          data-testid={`wallet-derived-${account.id}`}
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
            marginTop: spacing.sm,
          }}
        >
          {derived.map((path) => (
            <Chip
              key={path.index}
              testID={`wallet-derived-${account.id}-chip-${path.index}`}
              label={`#${path.index}`}
              // `pathIndex` is app state and belongs to whichever wallet is
              // active, so a chip on any other wallet reads as unselected.
              selected={account.id === activeId && path.index === pathIndex}
              onPress={() => {
                void (async () => {
                  if (account.id !== activeId) await accountActions.changeAccount(account.id);
                  await accountActions.changePathIndex(path.index);
                })();
              }}
              size="md"
              variant="filter"
            />
          ))}
        </div>
      )}
    </div>
  );
}
