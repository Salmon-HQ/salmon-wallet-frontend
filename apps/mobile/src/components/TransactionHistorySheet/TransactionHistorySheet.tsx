import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableWithoutFeedback,
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
import { ContentLoader, Rect } from '@salmon/shared';
import {
  colors,
  ms,
  vs,
  s,
  spacing,
  fontSize,
  fontFamilyNative,
  borderRadius,
  semantic,
} from '@salmon/shared';

import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { FLOAT_DELAY_MS, floatEntering, sinkExiting } from '../../utils/sinkAndFloat';
import { BottomSheetContainer } from '../BottomSheetContainer';
import { BottomSheetTitleHeader } from '../BottomSheetTitleHeader';
import { TransactionDetail } from '../TransactionDetail';
import { TransactionItem } from './TransactionItem';
import type { TransactionHistorySheetProps, Transaction } from './types';

// ============================================================================
// Skeleton Components
// ============================================================================

/**
 * Skeleton loader for a single transaction item
 * Matches the new TransactionItem layout with type badge and source badge
 */
const TransactionItemSkeleton: React.FC = () => {
  return (
    <View style={styles.skeletonContainer}>
      <ContentLoader
        speed={1.5}
        width="100%"
        height={92}
        backgroundColor={colors.skeleton.base}
        foregroundColor={colors.skeleton.highlight}
      >
        {/* Token logo (main) */}
        <Rect x="18" y="26" rx="20" ry="20" width="40" height="40" />
        {/* Type badge on logo */}
        <Rect x="46" y="22" rx="9" ry="9" width="18" height="18" />

        {/* Type label */}
        <Rect x="72" y="26" rx="4" ry="4" width="70" height="16" />
        {/* Source badge */}
        <Rect x="148" y="27" rx="4" ry="4" width="50" height="14" />
        {/* Description */}
        <Rect x="72" y="50" rx="4" ry="4" width="100" height="14" />

        {/* Amount line 1 (right side) */}
        <Rect x="75%" y="24" rx="4" ry="4" width="25%" height="14" />
        {/* Amount line 2 (right side) */}
        <Rect x="78%" y="42" rx="4" ry="4" width="22%" height="14" />
        {/* Time (right side) */}
        <Rect x="85%" y="62" rx="4" ry="4" width="15%" height="12" />
      </ContentLoader>
    </View>
  );
};

/**
 * Skeleton loader for multiple transaction items
 */
const TransactionListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: count }).map((_, index) => (
        <TransactionItemSkeleton key={`skeleton-${index}`} />
      ))}
    </View>
  );
};

/**
 * Empty state when no transactions
 */
const EmptyState: React.FC = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.emptyContainer} testID="activity-empty">
      <Text style={styles.emptyTitle}>{t('transactions.noTransactions')}</Text>
      <Text style={styles.emptySubtitle}>{t('transactions.emptySubtitle')}</Text>
    </View>
  );
};

/**
 * Error state with retry option
 */
const ErrorState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>{t('transactions.loadError')}</Text>
      {onRetry && (
        <TouchableWithoutFeedback onPress={onRetry}>
          <View style={styles.retryButton} testID="activity-retry-button">
            <Text style={styles.retryText}>{t('transactions.tapToRetry')}</Text>
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
};

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

  // Render individual transaction item
  const renderTransaction = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionItem
        transaction={item}
        onPress={handleTransactionPress}
        hiddenBalance={hiddenBalance}
      />
    ),
    [handleTransactionPress, hiddenBalance]
  );

  // Render footer (loading more indicator)
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color={colors.accent.primary} />
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
                  data={transactions}
                  renderItem={renderTransaction}
                  keyExtractor={(item) => item.id}
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
    paddingHorizontal: s(spacing.headerPadding),
  },
  listContent: {
    flexGrow: 1,
  },
  // Skeleton styles
  skeletonList: {
    paddingTop: vs(spacing.sm),
  },
  skeletonContainer: {
    backgroundColor: colors.background.tokenItem,
    borderRadius: borderRadius.lg,
    marginBottom: vs(spacing.md),
    overflow: 'hidden',
  },
  // Empty state styles
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(spacing['5.5xl']),
  },
  emptyTitle: {
    fontSize: ms(fontSize.xl),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.primary,
    marginBottom: vs(spacing.base),
  },
  emptySubtitle: {
    fontSize: ms(fontSize.bodyLg),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  // Error state styles
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(spacing['5.5xl']),
  },
  errorTitle: {
    fontSize: ms(fontSize.xl),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.primary,
    marginBottom: vs(spacing.base),
  },
  retryButton: {
    paddingVertical: vs(spacing.md),
    paddingHorizontal: s(spacing['2xl']),
    backgroundColor: colors.accent.primary,
    borderRadius: 10,
  },
  retryText: {
    fontSize: ms(fontSize.bodyLg),
    fontFamily: fontFamilyNative.medium,
    color: semantic.accent.onFill,
  },
  // Loading more
  loadingMoreContainer: {
    paddingVertical: vs(spacing.lg),
    alignItems: 'center',
  },
});

export default TransactionHistorySheet;
