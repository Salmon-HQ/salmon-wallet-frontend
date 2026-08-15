/**
 * TransactionHistoryPage - Full-page transaction history view
 *
 * Replaces the former TransactionHistorySheet dialog.
 * Renders as a full page with back navigation, matching the
 * page-navigation pattern used by TokenDetailPage and NftDetailPage.
 *
 * Features:
 * - Scrollable transaction list with infinite scroll
 * - Loading skeletons
 * - Empty and error states
 * - ScalesBackground decorative pattern
 */

import React, { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { colors, spacing, borderRadius, fontSize, fontWeight, opacity } from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';
import { PageShell } from '../PageShell';
import { TransactionItem } from './TransactionItem';
import type { TransactionHistoryPageProps, Transaction } from './types';

// ============================================================================
// Styled Components
// ============================================================================

// Skeleton styles
const SkeletonItem = styled(Box)({
  padding: `${spacing.lg}px ${spacing.lg}px`,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.md,
});

const SkeletonInfoSection = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
});

const SkeletonRightSection = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: spacing.xs,
});

// Empty state styles
const EmptyContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${spacing['5.5xl']}px ${spacing.lg}px`,
});

const EmptyTitle = styled(Typography)({
  fontSize: fontSize.md,
  fontWeight: fontWeight.medium,
  color: colors.text.primary,
  marginTop: spacing.lg,
  marginBottom: spacing.base,
});

const EmptySubtitle = styled(Typography)({
  fontSize: fontSize.base,
  color: colors.text.secondary,
  textAlign: 'center',
});

// Error state styles
const ErrorContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${spacing['5.5xl']}px ${spacing.lg}px`,
});

const ErrorTitle = styled(Typography)({
  fontSize: fontSize.md,
  fontWeight: fontWeight.medium,
  color: colors.text.primary,
  marginBottom: spacing.base,
});

const RetryButton = styled(Button)({
  backgroundColor: colors.accent.primary,
  color: colors.text.primary,
  textTransform: 'none',
  fontWeight: fontWeight.medium,
  padding: `${spacing.sm}px ${spacing['2xl']}px`,
  borderRadius: borderRadius.md,
  '&:hover': {
    backgroundColor: colors.accent.primary,
    opacity: opacity.soft,
  },
});

// Loading more indicator
const LoadingMoreContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  padding: `${spacing.lg}px 0`,
});

// ============================================================================
// Skeleton Components
// ============================================================================

const TransactionItemSkeleton: React.FC = () => (
  <BlurContainer
    borderColor={colors.border.subtle}
    style={{ borderRadius: borderRadius.lg, marginBottom: spacing.md, overflow: 'hidden' }}
  >
    <SkeletonItem>
      <Skeleton
        variant="circular"
        width={40}
        height={40}
        sx={{ bgcolor: colors.skeleton.base, flexShrink: 0 }}
      />
      <SkeletonInfoSection>
        <Box sx={{ display: 'flex', gap: `${spacing.sm}px`, alignItems: 'center' }}>
          <Skeleton
            variant="rounded"
            width={70}
            height={14}
            sx={{ bgcolor: colors.skeleton.base }}
          />
          <Skeleton
            variant="rounded"
            width={50}
            height={12}
            sx={{ bgcolor: colors.skeleton.base }}
          />
        </Box>
        <Skeleton
          variant="rounded"
          width={100}
          height={12}
          sx={{ bgcolor: colors.skeleton.base }}
        />
      </SkeletonInfoSection>
      <SkeletonRightSection>
        <Skeleton variant="rounded" width={80} height={14} sx={{ bgcolor: colors.skeleton.base }} />
        <Skeleton variant="rounded" width={60} height={12} sx={{ bgcolor: colors.skeleton.base }} />
        <Skeleton variant="rounded" width={40} height={10} sx={{ bgcolor: colors.skeleton.base }} />
      </SkeletonRightSection>
    </SkeletonItem>
  </BlurContainer>
);

const TransactionListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <Box>
    {Array.from({ length: count }).map((_, index) => (
      <TransactionItemSkeleton key={`skeleton-${index}`} />
    ))}
  </Box>
);

// ============================================================================
// State Components
// ============================================================================

const EmptyState: React.FC = () => {
  const { t } = useTranslation();
  return (
    <EmptyContainer data-testid="activity-empty">
      <ReceiptLongIcon sx={{ fontSize: fontSize['5xl'], color: colors.text.tertiary }} />
      <EmptyTitle>{t('transactions.noTransactions')}</EmptyTitle>
      <EmptySubtitle>{t('transactions.emptySubtitle')}</EmptySubtitle>
    </EmptyContainer>
  );
};

const ErrorState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  const { t } = useTranslation();
  return (
    <ErrorContainer>
      <ErrorTitle>{t('transactions.loadError')}</ErrorTitle>
      {onRetry && (
        <RetryButton
          onClick={onRetry}
          startIcon={<RefreshIcon />}
          data-testid="activity-retry-button"
        >
          {t('transactions.tapToRetry')}
        </RetryButton>
      )}
    </ErrorContainer>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export function TransactionHistoryPage({
  onBack,
  transactions,
  loading = false,
  loadingMore = false,
  onLoadMore,
  hasMore = false,
  hiddenBalance = false,
  onTransactionPress,
  onTransactionDetailClick,
  error = null,
  onRetry,
  className,
  style,
}: TransactionHistoryPageProps): React.ReactElement {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle scroll for infinite loading
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!hasMore || loadingMore || !onLoadMore) return;

      const target = event.currentTarget;
      const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

      // Trigger load more when within 100px of the bottom
      if (scrollBottom < 100) {
        onLoadMore();
      }
    },
    [hasMore, loadingMore, onLoadMore]
  );

  const handleTransactionPress = useCallback(
    (transaction: Transaction) => {
      onTransactionPress?.(transaction);
    },
    [onTransactionPress]
  );

  const handleTransactionDetailClick = useCallback(
    (transaction: Transaction) => {
      onTransactionDetailClick?.(transaction);
    },
    [onTransactionDetailClick]
  );

  const handleScrollContentRef = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
  }, []);

  return (
    <PageShell
      title={t('transactions.historyTitle')}
      onBack={onBack}
      scrollContentStyle={{
        padding: `${spacing.md}px ${spacing.lg}px ${spacing.xl}px`,
      }}
      scrollContentProps={{ onScroll: handleScroll as React.UIEventHandler<HTMLDivElement> }}
      scrollContentRef={handleScrollContentRef}
      style={style}
      className={className}
    >
      {/* Error State */}
      {error && !loading && <ErrorState onRetry={onRetry} />}

      {/* Loading State */}
      {loading && !error && <TransactionListSkeleton count={6} />}

      {/* Empty State */}
      {!loading && !error && transactions.length === 0 && <EmptyState />}

      {/* Transaction List */}
      {!loading && !error && transactions.length > 0 && (
        <Box data-testid="activity-list">
          {transactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              onPress={handleTransactionPress}
              onDetailClick={handleTransactionDetailClick}
              hiddenBalance={hiddenBalance}
            />
          ))}

          {/* Loading more indicator */}
          {loadingMore && (
            <LoadingMoreContainer>
              <CircularProgress size={24} sx={{ color: colors.accent.primary }} />
            </LoadingMoreContainer>
          )}
        </Box>
      )}
    </PageShell>
  );
}
