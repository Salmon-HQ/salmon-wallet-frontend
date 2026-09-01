/**
 * TransactionDetail — CORE 09.
 *
 * The shell: a status block, the meta card, whichever variant the type calls
 * for (swap or transfer), the receipt, and the two actions. Every block below
 * it is a `Card` from the kit, so this file owns almost no drawing of its own.
 */
import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, ClockIcon, ShareNetworkIcon, XCircleIcon, iconSize } from '../../icons';
import {
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  formatBlockNumber,
  formatDateTime,
  getBlockchainFromNetworkId,
  lineHeight,
  s,
  semantic,
  spacing,
  vs,
  type Blockchain,
  type NetworkEnvironment,
} from '@salmon/shared';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../Card';
import { Chip } from '../Chip';
import { IconBubble } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
import { TextButton } from '../Button';
import { ExplorerLinkButton } from '../Activity/ExplorerLinkButton';
import {
  TRANSACTION_TYPE_CONFIG,
  TYPE_LABEL_KEYS,
} from '../Activity/transactionTypes';
import { TransactionDetailDeveloper } from './TransactionDetailDeveloper';
import { TransactionDetailReceipt } from './TransactionDetailReceipt';
import { TransactionDetailSwap } from './TransactionDetailSwap';
import { TransactionDetailTransfer } from './TransactionDetailTransfer';
import type { TransactionDetailProps } from './types';
import type { KeyValueTone } from '../KeyValueRow';

const STATUS_CONFIG = {
  completed: { label: 'Completed', color: semantic.status.success, icon: CheckCircleIcon },
  failed: { label: 'Failed', color: semantic.status.danger, icon: XCircleIcon },
  pending: { label: 'Pending', color: semantic.status.warning, icon: ClockIcon },
};

/**
 * Confirmation depth, said in the row's value ink. It used to be a tinted
 * badge in three decorative hues; the kit gives a value four tones and this
 * fact is one of them.
 */
const CONFIRMATION_CONFIG: Record<string, { label: string; tone: KeyValueTone }> = {
  processed: { label: 'Processed', tone: 'secondary' },
  confirmed: { label: 'Confirmed', tone: 'primary' },
  finalized: { label: 'Finalized', tone: 'success' },
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  completed: 'transactions.detail.completed',
  failed: 'transactions.detail.failed',
  pending: 'transactions.detail.pending',
};

const CONFIRMATION_LABEL_KEYS: Record<string, string> = {
  processed: 'transactions.detail.processed',
  confirmed: 'transactions.detail.confirmed',
  finalized: 'transactions.detail.finalized',
};

/** The status mark at the head of the detail (CORE 09). */
const STATUS_MARK_SIZE = 48;

export const TransactionDetail: React.FC<TransactionDetailProps> = ({
  transaction,
  onViewExplorer,
  onCopyHash,
  onShare,
  developerMode,
  networkId,
  style,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const handleShare = useCallback(() => {
    if (transaction && onShare) {
      onShare(transaction);
    }
  }, [transaction, onShare]);

  const typeConfig = useMemo(() => {
    if (!transaction) return TRANSACTION_TYPE_CONFIG.unknown;
    return TRANSACTION_TYPE_CONFIG[transaction.type] || TRANSACTION_TYPE_CONFIG.unknown;
  }, [transaction]);

  const statusConfig = useMemo(() => {
    if (!transaction) return STATUS_CONFIG.completed;
    return STATUS_CONFIG[transaction.status] || STATUS_CONFIG.completed;
  }, [transaction]);

  // A swap with no route data still has a rate: one token in, one token out.
  // The row's inline panel derived it, and the detail is now the only place
  // that fact can live, so the derivation moves here with it.
  const conversionRate = useMemo(() => {
    if (!transaction) return null;
    const { swapRoute, inputs, outputs } = transaction;
    if (swapRoute?.conversionRate) return swapRoute.conversionRate;
    if (inputs.length !== 1 || outputs.length !== 1) return null;
    const fromToken = outputs[0];
    const toToken = inputs[0];
    const fromAmount = parseFloat(fromToken.amount) / Math.pow(10, fromToken.decimals);
    const toAmount = parseFloat(toToken.amount) / Math.pow(10, toToken.decimals);
    if (!(fromAmount > 0)) return null;
    return {
      fromSymbol: fromToken.symbol,
      toSymbol: toToken.symbol,
      rate: (toAmount / fromAmount).toFixed(6),
    };
  }, [transaction]);

  if (!transaction) {
    return null;
  }

  // Derive explorer target from the active network (same pattern as
  // SendSheet / NftDetailSheet) instead of hardcoding Solana mainnet.
  const explorerNetworkId = networkId ?? 'solana-mainnet';
  const explorerBlockchain = getBlockchainFromNetworkId(
    explorerNetworkId
  ).toUpperCase() as Blockchain;
  const explorerEnvironment = explorerNetworkId as NetworkEnvironment;

  const confirmation = transaction.confirmationStatus
    ? CONFIRMATION_CONFIG[transaction.confirmationStatus]
    : undefined;

  const StatusIcon = statusConfig.icon;

  return (
    <View style={[styles.container, style]}>
      {/* The transaction's own identity line, at the top of the detail's
          content. The sheet's chrome header keeps the surface's name and the
          way back. */}
      <View style={styles.header}>
        <IconBubble
          testID="tx-detail-status-mark"
          size={STATUS_MARK_SIZE}
          shape="circle"
          tone="accent-tint"
          icon={typeConfig.icon}
          iconSize={iconSize.lg}
        />
        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.title} maxFontSizeMultiplier={fontScaleCap.dense}>
              {t(TYPE_LABEL_KEYS[transaction.type] ?? TYPE_LABEL_KEYS.unknown, typeConfig.label)}
            </Text>
            {transaction.source && (
              <Chip
                testID="tx-detail-source"
                label={transaction.source}
                size="sm"
                variant="outline"
                style={styles.sourceChip}
              />
            )}
          </View>
          <View style={styles.statusRow}>
            <StatusIcon size={iconSize.sm} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {t(STATUS_LABEL_KEYS[transaction.status] ?? '', statusConfig.label)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Date & time, confirmation depth, block */}
        <Card padding="lg" gap={spacing.md} testID="tx-detail-meta">
          <KeyValueRow
            label={t('transactions.detail.dateTime', 'Date & Time')}
            value={formatDateTime(transaction.timestamp)}
            labelWeight={600}
          />
          {confirmation && (
            <KeyValueRow
              label={t('transactions.detail.confirmation', 'Confirmation')}
              value={t(
                CONFIRMATION_LABEL_KEYS[transaction.confirmationStatus as string] ?? '',
                confirmation.label
              )}
              valueTone={confirmation.tone}
              labelWeight={600}
            />
          )}
          {transaction.slot && (
            <KeyValueRow
              label={t('transactions.detail.block', 'Block')}
              value={`#${formatBlockNumber(transaction.slot)}`}
              labelWeight={600}
            />
          )}
        </Card>

        {transaction.type === 'swap' ? (
          <TransactionDetailSwap transaction={transaction} conversionRate={conversionRate} />
        ) : (
          <TransactionDetailTransfer transaction={transaction} />
        )}

        <TransactionDetailReceipt transaction={transaction} onCopyHash={onCopyHash} />

        {developerMode && <TransactionDetailDeveloper transaction={transaction} />}
      </ScrollView>

      {/* Fixed Bottom Action Bar — pad past the system nav bar (e.g.
          Samsung 3-button) so the Share action is never hidden. */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + vs(spacing.md) }]}>
        <ExplorerLinkButton
          txHash={transaction.id}
          blockchain={explorerBlockchain}
          environment={explorerEnvironment}
          showMenu
          onPress={(_url, _explorerName) => {
            if (onViewExplorer) {
              onViewExplorer(transaction);
            }
          }}
        />
        {onShare && (
          <TextButton
            testID="tx-detail-share-button"
            onPress={handleShare}
            icon={<ShareNetworkIcon size={iconSize.sm} color={semantic.text.accent} />}
          >
            {t('transactions.detail.share', 'Share')}
          </TextButton>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.md),
    paddingHorizontal: s(spacing.screenGutter),
    paddingBottom: vs(spacing.md),
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
    gap: vs(spacing.xs),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: s(spacing.sm),
    rowGap: vs(spacing.xxs),
  },
  title: {
    fontSize: s(fontSize.title),
    lineHeight: s(fontSize.title) * lineHeight.snug,
    fontFamily: fontFamilyNative.bold,
    color: semantic.text.primary,
    flexShrink: 1,
  },
  sourceChip: {
    flexShrink: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xs),
  },
  statusText: {
    fontSize: s(fontSize.mono),
    lineHeight: s(fontSize.mono) * lineHeight.snug,
    fontFamily: fontFamilyNative.bold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: s(spacing.screenGutter),
    paddingBottom: vs(spacing.md),
    gap: vs(spacing.md),
  },
  actions: {
    paddingHorizontal: s(spacing.screenGutter),
    paddingTop: vs(spacing.md),
    gap: vs(spacing.sm),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: semantic.border.hairline,
  },
});

export default TransactionDetail;
