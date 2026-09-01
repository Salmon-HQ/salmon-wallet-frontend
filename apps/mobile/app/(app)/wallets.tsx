/**
 * Wallets — CORE 10.
 *
 * The switcher was a panel behind the gate; it is a screen now, because the
 * second tap inside it changes what it is (rename, include, add, pick a
 * derived account). Aggregated balance on top, one card per wallet under an
 * "Include in total" heading, and an outlined "Add wallet" that routes to the
 * same add screen Settings → Accounts → Add opens.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  useAccountsContext,
  useBalance,
  useCurrencyContext,
  useUserConfig,
  useWalletTotals,
  sumIncludedTotals,
  fontFamilyNative,
  fontSize,
  fontWeight,
  getAccountAddress,
  getInitials,
  getShortAddress,
  isWatchOnlyAccount,
  letterSpacing,
  ms,
  s,
  semantic,
  spacing,
  vs,
  type Account,
  type NetworkId,
} from '@salmon/shared';
import {
  Card,
  DepthBackground,
  IconBubble,
  ScalesBackground,
  ScreenHeader,
  SectionLabel,
  SubAccountSelector,
  WatchOnlyBadge,
} from '../../src/components';
import {
  CheckCircleIcon,
  CircleIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSimpleIcon,
  PlusIcon,
  iconSize,
} from '../../src/icons';
import { useTabChrome } from '../../hooks/useTabChrome';

/** The wallet thumb, per `.pen` CORE 10. */
const WALLET_BUBBLE_SIZE = 44;
/** The inline rename affordance beside the name. */
const RENAME_BUBBLE_SIZE = 24;
/** The include control at the end of a wallet card. */
const INCLUDE_ICON_SIZE = 22;

export default function WalletsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { scrollBottomPadding } = useTabChrome();

  const [accountState, accountActions] = useAccountsContext();
  const { accounts, accountId, activeBlockchainAccount, networkId } = accountState;
  const [, { formatValue }] = useCurrencyContext();

  const userConfigAccount = useMemo(
    () => ({
      network: {
        environment: (activeBlockchainAccount ? networkId || 'solana-mainnet' : 'solana-mainnet') as
          | 'solana-mainnet'
          | 'solana-devnet',
        blockchain: 'solana',
      },
    }),
    [activeBlockchainAccount, networkId]
  );
  const { excludedFromTotal, setIncludedInTotal } = useUserConfig({
    activeBlockchainAccount: userConfigAccount,
  });

  // The eye is the app's one balance-visibility preference, not a second one
  // for this screen: `useBalance` owns it and persists it. Skipped, so mounting
  // this screen costs no request — only the preference comes back.
  const { hiddenBalance, toggleHidden } = useBalance({
    account: activeBlockchainAccount,
    networkId: (networkId ?? undefined) as NetworkId | undefined,
    skip: true,
  });

  const { totals } = useWalletTotals({
    accounts,
    networkId: (networkId ?? undefined) as NetworkId | undefined,
  });

  const isIncluded = useCallback(
    (walletId: string) => !excludedFromTotal.includes(walletId),
    [excludedFromTotal]
  );

  const includedCount = accounts.filter((a) => isIncluded(a.id)).length;

  const aggregated = useMemo(
    () =>
      sumIncludedTotals(
        accounts.map((a) => a.id),
        excludedFromTotal,
        totals
      ),
    [accounts, excludedFromTotal, totals]
  );

  const hiddenValue = '••••';

  const handleSelect = useCallback(
    async (id: string) => {
      if (id !== accountId) await accountActions.changeAccount(id);
      router.back();
    },
    [accountId, accountActions, router]
  );

  const handleRename = useCallback(
    (id: string) => {
      // The same rename screen Settings → Accounts → Edit reaches.
      router.push({ pathname: '/settings/[screen]', params: { screen: 'account-name', accountId: id } });
    },
    [router]
  );

  const handleAddWallet = useCallback(() => {
    // One add-wallet screen; `returnTo` lands the finished flow back here with
    // the new wallet already active.
    router.push({
      pathname: '/settings/[screen]',
      params: { screen: 'account-add', returnTo: 'wallets' },
    });
  }, [router]);

  const handleToggleInclude = useCallback(
    (walletId: string) => {
      const included = isIncluded(walletId);
      // The total can never be empty: excluding the last included wallet would
      // leave the card reading a number that belongs to nothing.
      if (included && includedCount <= 1) {
        Alert.alert(
          t('settings.wallets.total_title', 'Total balance'),
          t('settings.wallets.keep_one_included')
        );
        return;
      }
      void setIncludedInTotal(walletId, !included);
    },
    [includedCount, isIncluded, setIncludedInTotal, t]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Wallets is pushed over the tab shell, so it does not inherit the
          shell's water — it mounts the same two layers, edge to edge to the
          physical top, exactly as `LockContent` and `LoadingScreen` do. */}
      <DepthBackground />
      <ScalesBackground variant="deepField" />
      <ScreenHeader
        onBack={() => router.back()}
        title={t('settings.wallets.screen_title')}
        subtitle={t('settings.wallets.screen_subtitle')}
      />
      <ScrollView
        testID="wallets-screen"
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* The aggregated total. Ink, because it is a different object from the
            wallet cards under it, not a louder one. */}
        <Card testID="wallets-total-card" tone="ink" padding="lg" gap={spacing.xs}>
          <View style={styles.totalLabelRow}>
            <Text style={styles.totalLabel}>{t('settings.wallets.total_title')}</Text>
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
          </View>
          <Text testID="wallets-total-value" style={styles.totalValue} numberOfLines={1}>
            {hiddenBalance ? hiddenValue : formatValue(aggregated)}
          </Text>
          <Text testID="wallets-included-count" style={styles.totalCaption}>
            {t('settings.wallets.included_count', {
              included: includedCount,
              total: accounts.length,
            })}
          </Text>
        </Card>

        <View style={styles.headingRow}>
          <SectionLabel variant="caps">{t('settings.wallets.include_in_total')}</SectionLabel>
          <Text style={styles.headingHint}>{t('settings.wallets.include_hint')}</Text>
        </View>

        {accounts.map((account) => (
          <WalletCard
            key={account.id}
            account={account}
            isActive={account.id === accountId}
            included={isIncluded(account.id)}
            total={totals[account.id]}
            hiddenBalance={hiddenBalance}
            hiddenValue={hiddenValue}
            formatValue={formatValue}
            networkId={(networkId ?? undefined) as NetworkId | undefined}
            onSelect={() => handleSelect(account.id)}
            onRename={() => handleRename(account.id)}
            onToggleInclude={() => handleToggleInclude(account.id)}
          />
        ))}

        {/* The one action that is not a wallet: outlined, so it reads as an
            empty slot rather than a card with nothing in it. */}
        <Card
          testID="wallets-add-wallet"
          padding="lg"
          onPress={handleAddWallet}
          accessibilityLabel={t('settings.wallets.add_wallet')}
          style={styles.addCard}
        >
          <View style={styles.addRow}>
            <PlusIcon size={iconSize.md} color={semantic.accent.ink} />
            <Text style={styles.addLabel}>{t('settings.wallets.add_wallet')}</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// One wallet
// ============================================================================

interface WalletCardProps {
  account: Account;
  isActive: boolean;
  included: boolean;
  total: number | undefined;
  hiddenBalance: boolean;
  hiddenValue: string;
  formatValue: (value: number | undefined) => string;
  networkId: NetworkId | undefined;
  onSelect: () => void;
  onRename: () => void;
  onToggleInclude: () => void;
}

function WalletCard({
  account,
  isActive,
  included,
  total,
  hiddenBalance,
  hiddenValue,
  formatValue,
  networkId,
  onSelect,
  onRename,
  onToggleInclude,
}: WalletCardProps): React.ReactElement {
  const { t } = useTranslation();
  const [{ accountId: activeId, pathIndex }, accountActions] = useAccountsContext();
  const [imgError, setImgError] = useState(false);

  const address = getAccountAddress(account);
  const shortAddress = getShortAddress(address) ?? '';
  const initials = getInitials(account.name);

  // The derived accounts this wallet holds on the chain being read. Removed
  // from Home in 015; this is where a wallet's path indexes live now.
  const derived = useMemo(() => {
    const list = networkId ? account.networksAccounts?.[networkId] : undefined;
    if (!list || list.length < 2) return [];
    return list.map((blockchainAccount, index) => ({
      index,
      address: blockchainAccount?.getReceiveAddress?.() ?? '',
    }));
  }, [account.networksAccounts, networkId]);

  return (
    <Card
      testID={`wallet-card-${account.id}`}
      padding="lg"
      gap={spacing.sm}
      onPress={onSelect}
      accessibilityLabel={
        isActive
          ? t('accessibility.active_account', '{{name}}, active', { name: account.name })
          : account.name
      }
      style={isActive ? styles.activeCard : undefined}
    >
      <View style={styles.walletRow}>
        <IconBubble
          size={WALLET_BUBBLE_SIZE}
          shape="circle"
          tone={isActive ? 'ink' : 'accent-tint'}
        >
          {account.avatar && !imgError ? (
            <Image
              source={{ uri: account.avatar }}
              style={styles.avatarImage}
              contentFit="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <Text style={styles.avatarInitials}>{initials}</Text>
          )}
        </IconBubble>

        <View style={styles.walletInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.walletName} numberOfLines={1} ellipsizeMode="tail">
              {account.name}
            </Text>
            <IconBubble
              testID={`wallet-rename-${account.id}`}
              size={RENAME_BUBBLE_SIZE}
              shape="circle"
              tone="surface"
              icon={PencilSimpleIcon}
              iconSize={13}
              onPress={onRename}
              accessibilityLabel={t('accessibility.edit_account')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            />
            {isWatchOnlyAccount(account) && (
              <WatchOnlyBadge testID={`wallet-watch-only-${account.id}`} />
            )}
          </View>
          <Text testID={`wallet-balance-${account.id}`} style={styles.walletBalance}>
            {hiddenBalance ? hiddenValue : formatValue(total)}
            {shortAddress ? ` · ${shortAddress}` : ''}
          </Text>
        </View>

        <IconBubble
          testID={`wallet-include-${account.id}`}
          size={24}
          tone="ghost"
          icon={included ? CheckCircleIcon : CircleIcon}
          iconSize={INCLUDE_ICON_SIZE}
          iconColor={included ? semantic.accent.ink : semantic.text.tertiary}
          onPress={onToggleInclude}
          accessibilityLabel={
            included
              ? t('settings.wallets.exclude_from_total_a11y', { name: account.name })
              : t('settings.wallets.include_in_total_a11y', { name: account.name })
          }
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        />
      </View>

      {derived.length > 0 && (
        <SubAccountSelector
          testID={`wallet-derived-${account.id}`}
          accounts={derived}
          // `pathIndex` is app state and belongs to whichever wallet is active,
          // so a chip on any other wallet reads as unselected until that wallet
          // is the one in use.
          activeIndex={account.id === activeId ? pathIndex : -1}
          onSelect={async (index) => {
            if (account.id !== activeId) await accountActions.changeAccount(account.id);
            await accountActions.changePathIndex(index);
          }}
          style={styles.derivedRow}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: s(spacing.screenGutter),
    // No top padding: the header block already ends 20 above the content.
    // The component gap (DESIGN.md §Layout): 20 between sibling blocks.
    gap: vs(spacing.screenGutter),
  },
  totalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.sm),
  },
  totalLabel: {
    flex: 1,
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.semiBold,
    fontSize: ms(fontSize.caption),
  },
  totalValue: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontWeight: fontWeight.bold,
    fontSize: ms(fontSize.display),
    letterSpacing: letterSpacing.balance,
    fontVariant: ['tabular-nums'],
  },
  totalCaption: {
    color: semantic.text.tertiary,
    fontFamily: fontFamilyNative.medium,
    fontSize: ms(fontSize.micro),
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headingHint: {
    color: semantic.text.tertiary,
    fontFamily: fontFamilyNative.semiBold,
    fontSize: ms(fontSize.micro),
  },
  activeCard: {
    borderWidth: 1,
    borderColor: semantic.accent.ink,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.md),
  },
  walletInfo: {
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
  walletName: {
    flexShrink: 1,
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontWeight: fontWeight.bold,
    fontSize: ms(fontSize.bodyLg),
  },
  walletBalance: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.medium,
    fontSize: ms(fontSize.caption),
    fontVariant: ['tabular-nums'],
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: ms(fontSize.body),
  },
  derivedRow: {
    paddingHorizontal: 0,
  },
  addCard: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: semantic.border.raised,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(spacing.sm),
  },
  addLabel: {
    color: semantic.accent.ink,
    fontFamily: fontFamilyNative.bold,
    fontWeight: fontWeight.bold,
    fontSize: ms(fontSize.body),
  },
});
