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
  getAccountMnemonic,
  getInitials,
  getShortAddress,
  isWatchOnlyAccount,
  letterSpacing,
  ms,
  s,
  spacing,
  tabularNums,
  vs,
  type Account,
  type NetworkId,
  type Semantic,
} from '@salmon/shared';
import {
  Card,
  DepthBackground,
  IconBubble,
  ListRow,
  ScalesBackground,
  ScreenHeader,
  SectionLabel,
  SkeletonRow,
  WatchOnlyBadge,
} from '../../src/components';
import {
  CaretRightIcon,
  CheckCircleIcon,
  CircleIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSimpleIcon,
  PlusIcon,
  TreeStructureIcon,
  iconSize,
} from '../../src/icons';
import { useDerivedAccounts } from '../../src/contexts/DerivedAccountsContext';
import { useSemantic, useThemedStyles } from '../../src/theme/useThemedStyles';

/** The wallet thumb, per `.pen` CORE 10. */
const WALLET_BUBBLE_SIZE = 44;
/** The inline rename affordance beside the name. */
const RENAME_BUBBLE_SIZE = 24;
/** The include control at the end of a wallet card. */
const INCLUDE_ICON_SIZE = 22;
/** The leading well on a derived row — a step under the wallet's own 44. */
const DERIVED_BUBBLE_SIZE = 36;

// `tabularNums.native` types its array as readonly; RN's TextStyle wants a
// mutable one, so this copy is what satisfies the style typing.
const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

export default function WalletsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();

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
  const { excludedFromTotal, setIncludedInTotal, hiddenDerivedAccounts, setDerivedHidden } =
    useUserConfig({
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

  // Every wallet's total is the sum of all its derived accounts on this
  // network, minus the ones the user hid.
  const { totals } = useWalletTotals({
    accounts,
    networkId: (networkId ?? undefined) as NetworkId | undefined,
    hiddenDerivedAccounts,
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
      // The card is the wallet itself — index 0. Its derived accounts are
      // the rows under it; picking the card always lands on the parent.
      await accountActions.changePathIndex(0);
      router.back();
    },
    [accountId, accountActions, router]
  );

  const handleRename = useCallback(
    (id: string) => {
      // The same rename screen Settings → Accounts → Edit reaches.
      router.push({
        pathname: '/settings/[panel]',
        params: { panel: 'account-name', accountId: id },
      });
    },
    [router]
  );

  const handleAddWallet = useCallback(() => {
    // One add-wallet screen; `returnTo` lands the finished flow back here with
    // the new wallet already active.
    router.push({
      pathname: '/settings/[panel]',
      params: { panel: 'account-add', returnTo: 'wallets' },
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: vs(spacing.screenGutter) }]}
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
            hiddenIndexes={hiddenDerivedAccounts[account.id]}
            onSetHidden={(index, hidden) => setDerivedHidden(account.id, index, hidden)}
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
  /** Derivation indexes this wallet's owner has hidden. */
  hiddenIndexes: number[] | undefined;
  onSetHidden: (index: number, hidden: boolean) => Promise<void>;
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
  hiddenIndexes,
  onSetHidden,
  onSelect,
  onRename,
  onToggleInclude,
}: WalletCardProps): React.ReactElement {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();
  const [{ accountId: activeId, pathIndex }, accountActions] = useAccountsContext();
  const { status, rescan } = useDerivedAccounts();
  const [imgError, setImgError] = useState(false);

  const address = getAccountAddress(account);
  const shortAddress = getShortAddress(address) ?? '';
  const initials = getInitials(account.name);
  // Only a seed has a derivation tree to look through — an imported key or a
  // watched address has nothing to find, so the action is absent rather than
  // present and inert.
  const canRescan = !!getAccountMnemonic(account);
  const isScanning = status.scanningAccountId === account.id;

  // The derived accounts this wallet holds on the chain being read. Removed
  // from Home in 015; this is where a wallet's path indexes live now. Null
  // slots are holes in the derivation tree, not accounts.
  const derived = useMemo(() => {
    const list = networkId ? account.networksAccounts?.[networkId] : undefined;
    if (!list || list.length < 2) return [];
    // Index 0 is the card itself, never a row under it (owner, 2026-09-02).
    return list.flatMap((blockchainAccount, index) =>
      blockchainAccount && index > 0
        ? [{ index, address: blockchainAccount.getReceiveAddress?.() ?? '' }]
        : []
    );
  }, [account.networksAccounts, networkId]);

  const hidden = useMemo(() => hiddenIndexes ?? [], [hiddenIndexes]);
  const shownDerived = derived.filter(({ index }) => !hidden.includes(index));
  const hiddenDerived = derived.filter(({ index }) => hidden.includes(index));
  const [hiddenOpen, setHiddenOpen] = useState(false);

  const handleSelectDerived = useCallback(
    async (index: number) => {
      if (account.id !== activeId) await accountActions.changeAccount(account.id);
      await accountActions.changePathIndex(index);
    },
    [account.id, activeId, accountActions]
  );

  const handleSetHidden = useCallback(
    async (index: number, hide: boolean) => {
      // Hiding the account in use would leave the app standing on something it
      // no longer shows, so the wallet falls back to its own index 0 first.
      if (hide && account.id === activeId && index === pathIndex) {
        await accountActions.changePathIndex(0);
      }
      await onSetHidden(index, hide);
    },
    [account.id, activeId, pathIndex, accountActions, onSetHidden]
  );

  return (
    // `ListRow` is the card here — its own leading/title/trailing geometry
    // replaces what used to be hand-drawn styles duplicating it exactly. A
    // wallet's derived accounts are rows of their own, indented one gutter
    // under it and joined to it by a descent line, because they descend from
    // this wallet rather than sitting beside it — which is exactly what the
    // chips they replace could not say. Wrapped in a `View` (not a fragment)
    // so the screen's sibling gap of 20 applies once, between wallets — not a
    // second time between a wallet's own row and its descent, which stays at
    // the tighter internal-anatomy step.
    <View>
      <ListRow
        testID={`wallet-card-${account.id}`}
        padding="lg"
        onPress={onSelect}
        accessibilityLabel={
          isActive
            ? t('accessibility.active_account', '{{name}}, active', { name: account.name })
            : account.name
        }
        style={isActive ? styles.activeCard : undefined}
        leading={
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
        }
        title={account.name}
        titleAccessory={
          <>
            {canRescan && (
              <IconBubble
                testID={`wallet-rescan-${account.id}`}
                size={RENAME_BUBBLE_SIZE}
                shape="circle"
                tone="surface"
                icon={TreeStructureIcon}
                iconSize={13}
                onPress={() => void rescan(account.id)}
                disabled={status.scanningAccountId !== null}
                accessibilityLabel={t('settings.wallets.find_derived')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            />
            {isWatchOnlyAccount(account) && (
              <WatchOnlyBadge testID={`wallet-watch-only-${account.id}`} />
            )}
          </>
        }
        subtitle={
          <Text testID={`wallet-balance-${account.id}`} style={styles.walletBalance}>
            {hiddenBalance ? hiddenValue : formatValue(total)}
            {shortAddress ? ` · ${shortAddress}` : ''}
          </Text>
        }
        trailing={
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
        }
      />

      {(isScanning || derived.length > 0) && (
        <View testID={`wallet-derived-${account.id}`} style={styles.derivedBlock}>
          {/* The descent: one hairline in `border.default` dropping from the
              parent's leading edge past every row that came out of it. */}
          <View style={styles.derivedDescent} />
          {isScanning ? (
            <>
              <SkeletonRow
                testID={`wallet-derived-skeleton-${account.id}`}
                leadingSize={DERIVED_BUBBLE_SIZE}
                trailingWidth={INCLUDE_ICON_SIZE}
                accessibilityLabel={t('settings.wallets.finding_derived')}
              />
              <SkeletonRow leadingSize={DERIVED_BUBBLE_SIZE} trailingWidth={INCLUDE_ICON_SIZE} />
            </>
          ) : (
            <>
              {shownDerived.map(({ index, address: derivedAddress }) => (
                <DerivedRow
                  key={index}
                  account={account}
                  index={index}
                  address={derivedAddress}
                  // `pathIndex` is app state and belongs to whichever wallet is
                  // active, so a row on any other wallet reads as unselected
                  // until that wallet is the one in use.
                  isCurrent={account.id === activeId && index === pathIndex}
                  hidden={false}
                  onSelect={() => void handleSelectDerived(index)}
                  onSetHidden={handleSetHidden}
                />
              ))}

              {hiddenDerived.length > 0 && (
                <>
                  <ListRow
                    testID={`wallet-hidden-toggle-${account.id}`}
                    onPress={() => setHiddenOpen((open) => !open)}
                    leading={
                      <IconBubble
                        size={DERIVED_BUBBLE_SIZE}
                        shape="circle"
                        tone="surface"
                        icon={EyeSlashIcon}
                        iconSize={iconSize.sm}
                      />
                    }
                    title={t('settings.wallets.hidden_derived', { count: hiddenDerived.length })}
                    trailing={
                      <CaretRightIcon
                        size={INCLUDE_ICON_SIZE}
                        color={semantic.text.tertiary}
                        weight={hiddenOpen ? 'fill' : 'regular'}
                      />
                    }
                  />
                  {hiddenOpen &&
                    hiddenDerived.map(({ index, address: derivedAddress }) => (
                      <DerivedRow
                        key={index}
                        account={account}
                        index={index}
                        address={derivedAddress}
                        isCurrent={false}
                        hidden
                        onSelect={() => void handleSelectDerived(index)}
                        onSetHidden={handleSetHidden}
                      />
                    ))}
                </>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// One derived account
// ============================================================================

interface DerivedRowProps {
  account: Account;
  index: number;
  address: string;
  isCurrent: boolean;
  hidden: boolean;
  onSelect: () => void;
  onSetHidden: (index: number, hidden: boolean) => Promise<void>;
}

/**
 * One path index of one wallet, drawn as a descendant of its card.
 *
 * Hiding is reversible and is the only thing offered: a derived account comes
 * out of the seed, so deleting it would remove nothing and the next scan would
 * find it again. Index 0 is the wallet itself and carries no hide control —
 * `useUserConfig` refuses it too, so the rule holds even if a call site forgets.
 */
function DerivedRow({
  account,
  index,
  address,
  isCurrent,
  hidden,
  onSelect,
  onSetHidden,
}: DerivedRowProps): React.ReactElement {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const label = `${account.name} · ${index}`;

  return (
    <ListRow
      testID={`wallet-derived-${account.id}-${index}`}
      onPress={onSelect}
      accessibilityLabel={
        isCurrent
          ? t('accessibility.active_account', '{{name}}, active', { name: label })
          : undefined
      }
      leading={
        <IconBubble
          size={DERIVED_BUBBLE_SIZE}
          shape="circle"
          tone={isCurrent ? 'accent-tint' : 'surface'}
          icon={TreeStructureIcon}
          iconSize={iconSize.sm}
        />
      }
      title={label}
      subtitle={getShortAddress(address) ?? address}
      trailing={
        <View style={derivedTrailing.row}>
          {isCurrent && (
            <CheckCircleIcon size={INCLUDE_ICON_SIZE} color={semantic.accent.ink} weight="fill" />
          )}
          {index !== 0 && (
            <IconBubble
              testID={`wallet-derived-hide-${account.id}-${index}`}
              size={24}
              tone="ghost"
              icon={hidden ? EyeIcon : EyeSlashIcon}
              iconSize={INCLUDE_ICON_SIZE}
              iconColor={semantic.text.tertiary}
              onPress={() => void onSetHidden(index, !hidden)}
              accessibilityLabel={
                hidden
                  ? t('settings.wallets.show_derived_a11y', { name: label })
                  : t('settings.wallets.hide_derived_a11y', { name: label })
              }
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            />
          )}
        </View>
      }
    />
  );
}

/** The row's two trailing controls, side by side at the internal 8 step. */
const derivedTrailing = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.sm),
  },
});

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
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
      color: t.text.secondary,
      fontFamily: fontFamilyNative.semiBold,
      fontSize: ms(fontSize.caption),
    },
    totalValue: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.bold,
      fontWeight: fontWeight.bold,
      fontSize: ms(fontSize.display),
      letterSpacing: letterSpacing.balance,
      ...TABULAR,
    },
    totalCaption: {
      color: t.text.tertiary,
      fontFamily: fontFamilyNative.medium,
      fontSize: ms(fontSize.micro),
    },
    headingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headingHint: {
      color: t.text.tertiary,
      fontFamily: fontFamilyNative.semiBold,
      fontSize: ms(fontSize.micro),
    },
    activeCard: {
      borderWidth: 1,
      borderColor: t.accent.ink,
    },
    // The kept-custom `ListRow` subtitle node: `ListRow` draws a string
    // subtitle in this same body/secondary style, but the balance needs the
    // Tabular Rule, which the row's own subtitle text doesn't carry.
    walletBalance: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.medium,
      fontSize: ms(fontSize.body),
      ...TABULAR,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarInitials: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.bold,
      fontSize: ms(fontSize.body),
    },
    // The descent block: indented one gutter under its wallet, its rows at the
    // internal 12 step rather than the screen's 20 sibling gap — they are this
    // wallet's own anatomy, not the next component.
    derivedBlock: {
      marginTop: vs(spacing.md),
      paddingLeft: s(spacing.screenGutter),
      gap: vs(spacing.md),
    },
    derivedDescent: {
      position: 'absolute',
      left: s(spacing.screenGutter) / 2,
      top: 0,
      bottom: vs(spacing.md),
      width: StyleSheet.hairlineWidth,
      backgroundColor: t.border.default,
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
      fontSize: ms(fontSize.body),
    },
  });
