import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Animated,
  BackHandler,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import ReAnimated, { useReducedMotion } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { ms, vs, s, spacing, fontSize, semantic } from '@salmon/shared';

import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { FLOAT_DELAY_MS, floatEntering, sinkExiting } from '../../utils/sinkAndFloat';
import { BottomSheetContainer } from '../BottomSheetContainer';
import { BottomSheetTitleHeader } from '../BottomSheetTitleHeader';
import { SectionLabel } from '../SectionLabel';
import { EmptyState, ErrorState, TransactionListSkeleton } from './ActivityStates';
import { TransactionDetail } from '../TransactionDetail';
import { TransactionItem } from './TransactionItem';
import type { TransactionHistorySheetProps, Transaction } from './types';

// ============================================================================
// Day grouping
// ============================================================================

/** The two runs CORE 08 draws above the activity list. */
type ActivityGroup = 'today' | 'earlier';

const GROUP_LABEL_KEYS: Record<ActivityGroup, string> = {
  today: 'transactions.groupToday',
  earlier: 'transactions.groupEarlier',
};

/**
 * One entry in the flat list: a day label, or a transaction. The labels ride
 * in the same `FlatList` as the rows so pagination, the scroll offset the top
 * fade reads, and the footer all keep working unchanged.
 */
type ActivityRow =
  | { kind: 'header'; key: string; group: ActivityGroup }
  | { kind: 'transaction'; key: string; transaction: Transaction };

// ============================================================================
// Main Component
// ============================================================================

/**
 * TransactionHistorySheet - the Activity sheet
 *
 * Two steps in one sheet: the list, and one transaction's detail. Tapping a
 * row does not open a second sheet on top — the list sinks and the detail
 * floats up in its place, and back is the mirror. DESIGN.md §Motion's rule
 * that a sheet's content never speaks the verb is about the sheet arriving
 * and leaving; a step change inside a sheet that is already on screen is the
 * other event, and it does speak it — the settings panel stack is the
 * precedent.
 *
 * Features:
 * - Slide-up animation from bottom
 * - Drag to dismiss
 * - Paginated transaction list with infinite scroll
 * - In-place detail step with a mirrored back
 * - Loading skeletons
 * - Empty and error states
 *
 * @example
 * ```tsx
 * <TransactionHistorySheet
 *   visible={isVisible}
 *   onClose={() => setIsVisible(false)}
 *   transactions={transactions}
 *   loading={loading}
 *   hasMore={hasMore}
 *   onLoadMore={loadMore}
 * />
 * ```
 */
export const TransactionHistorySheet: React.FC<TransactionHistorySheetProps> = ({
  visible,
  onClose,
  transactions,
  loading = false,
  loadingMore = false,
  onLoadMore,
  hasMore = false,
  hiddenBalance = false,
  onTransactionPress,
  error = null,
  onRetry,
  onViewExplorer,
  onCopyHash,
  onShare,
  developerMode,
  networkId,
  style,
}) => {
  const { t } = useTranslation();
  const isReduceMotionEnabled = useReducedMotion();
  // Top fade gradient opacity (driven by scroll offset)
  const topFadeOpacity = useMemo(() => new Animated.Value(0), []);
  const { bottomInset, standardContentBottomPadding } = useBottomSheetChrome();

  // Which step is on screen: the list, or one transaction's detail.
  const [detail, setDetail] = useState<Transaction | null>(null);
  // Whether a step has happened in this opening. The list floats in only when
  // it is coming back from the detail — on the sheet's own arrival it is
  // already there, and content that spoke the verb then would say it twice.
  const [stepped, setStepped] = useState(false);

  // A fresh opening always starts on the list. Reset on the open transition
  // (not the close one) so nothing swaps behind a sheet that is still ebbing.
  const [wasVisible, setWasVisible] = useState(visible);
  if (wasVisible !== visible) {
    setWasVisible(visible);
    if (visible) {
      setDetail(null);
      setStepped(false);
    }
  }

  // Handle transaction press — step into the detail, in place
  const handleTransactionPress = useCallback(
    (transaction: Transaction) => {
      onTransactionPress?.(transaction);
      // The gradient tracks the list's scroll; a step starts at the top.
      topFadeOpacity.setValue(0);
      setStepped(true);
      setDetail(transaction);
    },
    [onTransactionPress, topFadeOpacity]
  );

  const handleBackToList = useCallback(() => {
    topFadeOpacity.setValue(0);
    setDetail(null);
  }, [topFadeOpacity]);

  // Android hardware back returns to the list before it leaves the sheet.
  useEffect(() => {
    if (Platform.OS !== 'android' || !visible || !detail) return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setDetail(null);
      return true;
    });

    return () => subscription.remove();
  }, [visible, detail]);

  // Handle scroll to show/hide top fade gradient dynamically
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const opacity = Math.min(offsetY / 30, 1);
      topFadeOpacity.setValue(opacity);
    },
    [topFadeOpacity]
  );

  // Handle end reached for pagination
  const handleEndReached = useCallback(() => {
    if (!loadingMore && hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [loadingMore, hasMore, onLoadMore]);

  // The list is grouped by day, as CORE 08 draws it: one "Today" run and one
  // "Earlier" run, each introduced by a `SectionLabel`. The rows arrive
  // newest-first, so a single pass over them is enough — no sort, no
  // SectionList, and the group label is just another row in the same list.
  const rows = useMemo<ActivityRow[]>(() => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    // `Transaction.timestamp` is in seconds (see `formatRelativeTimeCompact`).
    const startOfTodaySeconds = midnight.getTime() / 1000;

    const items: ActivityRow[] = [];
    let openGroup: ActivityGroup | null = null;

    for (const transaction of transactions) {
      const group: ActivityGroup =
        transaction.timestamp >= startOfTodaySeconds ? 'today' : 'earlier';
      if (group !== openGroup) {
        openGroup = group;
        items.push({ kind: 'header', key: `activity-group-${group}`, group });
      }
      items.push({ kind: 'transaction', key: transaction.id, transaction });
    }

    return items;
  }, [transactions]);

  // Render one row: a day label, or a transaction
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
          onPress={handleTransactionPress}
          hiddenBalance={hiddenBalance}
        />
      );
    },
    [handleTransactionPress, hiddenBalance, t]
  );

  // Render footer (loading more indicator)
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color={semantic.accent.fill} />
      </View>
    );
  }, [loadingMore]);

  const headerContent = (
    <BottomSheetTitleHeader
      title={t('actions.activity')}
      onBack={detail ? handleBackToList : undefined}
      backAccessibilityLabel={t('general.back')}
    />
  );

  // The verb, at content depth: what leaves sinks, what arrives floats one
  // beat later, and reduce motion resolves both to an instant cut.
  const stepEntering = floatEntering(isReduceMotionEnabled, { delayMs: FLOAT_DELAY_MS });
  const stepExiting = sinkExiting(isReduceMotionEnabled);

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      headerContent={headerContent}
      showFadeGradient
      fadeGradientTop={vs(12) + vs(8) + ms(fontSize.headline) + vs(18)}
      scrollOffsetValue={topFadeOpacity}
      style={style}
    >
      {/* Content */}
      <View style={styles.stack}>
        {!detail && (
          <ReAnimated.View
            key="activity-list-step"
            testID="activity-list-step"
            style={styles.step}
            entering={stepped ? stepEntering : undefined}
            exiting={stepExiting}
          >
            <View style={styles.content}>
              {/* Error State */}
              {error && !loading && <ErrorState onRetry={onRetry} />}

              {/* Loading State */}
              {loading && !error && <TransactionListSkeleton count={6} />}

              {/* Empty State */}
              {!loading && !error && transactions.length === 0 && <EmptyState />}

              {/* Transaction List */}
              {!loading && !error && transactions.length > 0 && (
                <FlatList
                  testID="activity-list"
                  data={rows}
                  renderItem={renderRow}
                  keyExtractor={(item) => item.key}
                  contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: standardContentBottomPadding },
                  ]}
                  showsVerticalScrollIndicator={false}
                  scrollIndicatorInsets={{ bottom: bottomInset }}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  onEndReached={handleEndReached}
                  onEndReachedThreshold={0.5}
                  ListFooterComponent={renderFooter}
                />
              )}
            </View>
          </ReAnimated.View>
        )}

        {detail && (
          <ReAnimated.View
            key={`activity-detail-step-${detail.id}`}
            testID="activity-detail-step"
            style={styles.step}
            entering={stepEntering}
            exiting={stepExiting}
          >
            <TransactionDetail
              transaction={detail}
              onViewExplorer={onViewExplorer}
              onCopyHash={onCopyHash}
              onShare={onShare}
              developerMode={developerMode}
              networkId={networkId}
            />
          </ReAnimated.View>
        )}
      </View>
    </BottomSheetContainer>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  stack: {
    flex: 1,
  },
  step: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    paddingHorizontal: s(spacing.screenGutter),
  },
  /** The day label introduces the run under it, not the row above it. */
  groupLabel: {
    marginBottom: vs(spacing.sm),
  },
  listContent: {
    flexGrow: 1,
  },
  // Loading more
  loadingMoreContainer: {
    paddingVertical: vs(spacing.lg),
    alignItems: 'center',
  },
});

export default TransactionHistorySheet;
