/**
 * Activity — CORE 08.
 *
 * The list was a step inside a bottom sheet; it is a screen now, because the
 * second tap inside it changes what it is (DESIGN.md §Sheets — the state
 * rule): every row opens a transaction. The detail itself stays a sheet over
 * this screen — it shows one thing and the next tap only dismisses it.
 *
 * Filtering is client-side over what has been loaded: the indexer has no type
 * filter, so a server round trip per chip would return the same page with
 * fewer rows in it. The selection is screen state and leaves with the screen.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  s,
  semantic,
  spacing,
  useAccountsContext,
  useBalance,
  useSendContacts,
  useTransactions,
  vs,
  type NetworkId,
  type Transaction,
} from '@salmon/shared';
import {
  ACTIVITY_FILTER_KEYS,
  ActivityEmptyState,
  ActivityErrorState,
  DepthBackground,
  ScalesBackground,
  ScreenHeader,
  SectionLabel,
  TransactionDetail,
  TransactionItem,
  TransactionListSkeleton,
  UnderlineTabs,
  GROUP_LABEL_KEYS,
  groupByDay,
  matchesFilter,
  type ActivityFilter,
  type ActivityRow,
} from '../../src/components';
import { BottomSheetContainer } from '../../src/components/BottomSheetContainer';
import { useDeveloperMode } from '../../src/contexts/DeveloperModeContext';

// ============================================================================
// Screen
// ============================================================================

export default function ActivityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const developerMode = useDeveloperMode();

  const [accountState] = useAccountsContext();
  const { ready, activeBlockchainAccount, networkId } = accountState;

  // The lock overlay now mounts in `(app)/_layout.tsx`, above the whole
  // stack, so it covers this screen directly — this is a plain pushed
  // screen, not a `fullScreenModal` like Powerups, so no self-close is
  // needed here.

  const address = activeBlockchainAccount?.getReceiveAddress() ?? '';
  const explorerNetworkId = (networkId ?? 'solana-mainnet') as NetworkId;

  const {
    transactions,
    loading,
    loadingMore,
    refreshing,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useTransactions({
    address,
    networkId: explorerNetworkId,
    skip: !ready || !activeBlockchainAccount,
    account: activeBlockchainAccount,
  });

  // The app's one balance-visibility preference, not a second one for this
  // screen. Skipped, so mounting costs no balance request.
  const { hiddenBalance } = useBalance({
    account: activeBlockchainAccount,
    networkId: (networkId ?? undefined) as NetworkId | undefined,
    skip: true,
  });

  // A row says who, not where, when the address book knows the counterparty.
  const { contacts } = useSendContacts(address);
  const contactsByAddress = useMemo(
    () => Object.fromEntries(contacts.map((contact) => [contact.address, contact.name])),
    [contacts]
  );

  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [detail, setDetail] = useState<Transaction | null>(null);

  const filterOptions = useMemo(
    () => ACTIVITY_FILTER_KEYS.map((key) => ({ key, label: t(`activity.filters.${key}`) })),
    [t]
  );

  const visible = useMemo(
    () => (transactions as Transaction[]).filter((tx) => matchesFilter(tx.type, filter)),
    [transactions, filter]
  );

  const rows = useMemo(() => groupByDay(visible), [visible]);

  const handleEndReached = useCallback(() => {
    if (!loadingMore && hasMore) loadMore();
  }, [loadingMore, hasMore, loadMore]);

  const handleShare = useCallback(
    async (transaction: Transaction) => {
      const explorerUrl =
        explorerNetworkId === 'solana-devnet'
          ? `https://solscan.io/tx/${transaction.id}?cluster=devnet`
          : `https://solscan.io/tx/${transaction.id}`;
      try {
        await Share.share({
          message: t('transactions.share_message', {
            url: explorerUrl,
            defaultValue: 'Check out this transaction: {{url}}',
          }),
          url: explorerUrl,
        });
      } catch (shareError) {
        console.error('Failed to share transaction:', shareError);
      }
    },
    [explorerNetworkId, t]
  );

  const renderRow = useCallback(
    ({ item }: { item: ActivityRow }) => {
      if (item.kind === 'header') {
        return (
          <SectionLabel variant="group" testID={item.key} style={styles.groupLabel}>
            {t(GROUP_LABEL_KEYS[item.group])}
          </SectionLabel>
        );
      }

      return (
        <TransactionItem
          transaction={item.transaction}
          onPress={setDetail}
          hiddenBalance={hiddenBalance}
          contacts={contactsByAddress}
        />
      );
    },
    [contactsByAddress, hiddenBalance, t]
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={semantic.accent.fill} />
      </View>
    );
  }, [loadingMore]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Pushed over the tab shell, so it does not inherit the shell's water —
          it mounts the same two layers, exactly as Wallets does. */}
      <DepthBackground />
      <ScalesBackground variant="deepField" />

      <ScreenHeader
        onBack={() => router.back()}
        title={t('actions.activity')}
        subtitle={t('transactions.tapToViewDetails')}
      />

      <View testID="activity-screen" style={styles.body}>
        {/* Lateral choices take the travelling underline, never a boxed or
            filled container — DESIGN.md §Navigation. Same component as the
            home sub-tabs, one size down. */}
        <UnderlineTabs
          testID="activity-filters"
          tabs={filterOptions}
          activeKey={filter}
          onChange={(key) => setFilter(key as ActivityFilter)}
          size="sm"
          tabTestIDPrefix="activity-filters"
          style={styles.filters}
        />

        {error && !loading && <ActivityErrorState onRetry={refresh} />}

        {loading && !error && <TransactionListSkeleton count={6} />}

        {!loading && !error && visible.length === 0 && (
          <ActivityEmptyState
            subtitle={filter === 'all' ? undefined : t('activity.emptyFiltered')}
          />
        )}

        {!loading && !error && visible.length > 0 && (
          <FlatList
            testID="activity-list"
            data={rows}
            renderItem={renderRow}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{ paddingBottom: vs(spacing.screenGutter) }}
            showsVerticalScrollIndicator={false}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={semantic.text.secondary}
              />
            }
          />
        )}
      </View>

      {/* CORE 09 is a screen of its own later; today the detail is one state
          over the list — it shows a transaction and the next tap dismisses
          it, which is exactly what a sheet is for. */}
      <BottomSheetContainer
        visible={detail !== null}
        onClose={() => setDetail(null)}
        testID="activity-detail-sheet"
      >
        {detail && (
          <TransactionDetail
            transaction={detail}
            onShare={handleShare}
            developerMode={developerMode}
            networkId={networkId}
          />
        )}
      </BottomSheetContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: s(spacing.screenGutter),
  },
  filters: {
    alignSelf: 'flex-start',
  },
  /**
   * The component gap (DESIGN.md §Layout): 20 between every sibling on the
   * root content stack — filters, a day label, and each card all sit 20
   * apart. Carried as `marginTop` on the item that opens the next block
   * (the label) so it also supplies the filters→first-label gap without a
   * second margin compounding on top of it.
   */
  groupLabel: {
    marginTop: vs(spacing.screenGutter),
  },
  loadingMore: {
    paddingVertical: vs(spacing.lg),
    alignItems: 'center',
  },
});
