/**
 * TransactionDetail — CORE 09, on the DOM.
 *
 * The shell: a status block, the meta card, whichever variant the type calls
 * for (swap or transfer), the receipt, and the two actions. Every block below
 * it is a `Card` from the kit, so this file owns almost no drawing of its own.
 *
 * The mobile twin is
 * `apps/mobile/src/components/TransactionDetail/TransactionDetail.tsx`. It is
 * the content of the Activity screen's sheet; the sheet scrolls, so the
 * detail does not.
 */
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  borderWidth,
  fontFamily,
  fontSize,
  fontWeight,
  formatBlockNumber,
  formatDateTime,
  getBlockchainFromNetworkId,
  lineHeight,
  spacing,
  type Blockchain,
  type NetworkEnvironment,
  type Semantic,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CheckCircleIcon, ClockIcon, ShareNetworkIcon, XCircleIcon, iconSize } from '../../icons';
import { TextButton } from '../Button';
import { Card } from '../Card';
import { Chip } from '../Chip';
import { IconBubble } from '../IconBubble';
import { KeyValueRow, type KeyValueTone } from '../KeyValueRow';
import { ExplorerLinkButton } from '../TransactionHistoryPage/ExplorerLinkButton';
import {
  TYPE_LABEL_KEYS,
  transactionTypeConfigFor,
} from '../TransactionHistoryPage/transactionTypes';
import { TransactionDetailDeveloper } from './TransactionDetailDeveloper';
import { TransactionDetailReceipt } from './TransactionDetailReceipt';
import { TransactionDetailSwap } from './TransactionDetailSwap';
import { TransactionDetailTransfer } from './TransactionDetailTransfer';
import type { TransactionDetailProps } from './types';

const statusConfigFor = (t: Semantic) => ({
  completed: { label: 'Completed', color: t.status.success, icon: CheckCircleIcon },
  failed: { label: 'Failed', color: t.status.danger, icon: XCircleIcon },
  pending: { label: 'Pending', color: t.status.warning, icon: ClockIcon },
});

/**
 * Confirmation depth, said in the row's value ink. The kit gives a value four
 * tones and this fact is one of them.
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

export function TransactionDetail({
  transaction,
  onViewExplorer,
  onCopyHash,
  onShare,
  developerMode,
  networkId,
  className,
  style,
}: TransactionDetailProps): React.ReactElement | null {
  const { t: translate } = useTranslation();
  const t = useSemantic();
  const STATUS_CONFIG = useMemo(() => statusConfigFor(t), [t]);
  const TRANSACTION_TYPE_CONFIG = useMemo(() => transactionTypeConfigFor(t), [t]);

  const handleShare = useCallback(() => {
    if (transaction && onShare) onShare(transaction);
  }, [transaction, onShare]);

  const typeConfig = useMemo(() => {
    if (!transaction) return TRANSACTION_TYPE_CONFIG.unknown;
    return TRANSACTION_TYPE_CONFIG[transaction.type] || TRANSACTION_TYPE_CONFIG.unknown;
  }, [transaction, TRANSACTION_TYPE_CONFIG]);

  const statusConfig = useMemo(() => {
    if (!transaction) return STATUS_CONFIG.completed;
    return STATUS_CONFIG[transaction.status] || STATUS_CONFIG.completed;
  }, [transaction, STATUS_CONFIG]);

  // A swap with no route data still has a rate: one token in, one token out.
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

  if (!transaction) return null;

  // Derive explorer target from the active network instead of hardcoding
  // Solana mainnet; a devnet session links to the devnet cluster (spec 026).
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
    <div
      data-testid="tx-detail"
      className={className}
      style={{ display: 'flex', flexDirection: 'column', ...style }}
    >
      {/* The transaction's own identity line, at the top of the detail's
          content. The sheet's chrome keeps the way back. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          paddingBottom: spacing.md,
        }}
      >
        <IconBubble
          testID="tx-detail-status-mark"
          size={STATUS_MARK_SIZE}
          shape="circle"
          tone="accent-tint"
          icon={typeConfig.icon}
          iconSize={iconSize.lg}
        />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.xs,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              columnGap: spacing.sm,
              rowGap: spacing.xxs,
            }}
          >
            <h2
              data-testid="tx-detail-title"
              style={{
                margin: 0,
                fontFamily: fontFamily.sans,
                fontSize: fontSize.title,
                lineHeight: `${fontSize.title * lineHeight.snug}px`,
                fontWeight: fontWeight.bold,
                color: t.text.primary,
                minWidth: 0,
              }}
            >
              {translate(
                TYPE_LABEL_KEYS[transaction.type] ?? TYPE_LABEL_KEYS.unknown,
                typeConfig.label
              )}
            </h2>
            {transaction.source && (
              <Chip
                testID="tx-detail-source"
                label={transaction.source}
                size="sm"
                variant="outline"
              />
            )}
          </div>
          <div
            data-testid="tx-detail-status"
            style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}
          >
            <StatusIcon size={iconSize.sm} color={statusConfig.color} />
            <span
              style={{
                fontFamily: fontFamily.sans,
                fontSize: fontSize.mono,
                lineHeight: `${fontSize.mono * lineHeight.snug}px`,
                fontWeight: fontWeight.bold,
                color: statusConfig.color,
              }}
            >
              {translate(STATUS_LABEL_KEYS[transaction.status] ?? '', statusConfig.label)}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {/* Date & time, confirmation depth, block */}
        <Card padding="lg" gap={spacing.md} testID="tx-detail-meta">
          <KeyValueRow
            label={translate('transactions.detail.dateTime', 'Date & Time')}
            value={formatDateTime(transaction.timestamp)}
            labelWeight={600}
          />
          {confirmation && (
            <KeyValueRow
              label={translate('transactions.detail.confirmation', 'Confirmation')}
              value={translate(
                CONFIRMATION_LABEL_KEYS[transaction.confirmationStatus as string] ?? '',
                confirmation.label
              )}
              valueTone={confirmation.tone}
              labelWeight={600}
            />
          )}
          {transaction.slot && (
            <KeyValueRow
              label={translate('transactions.detail.block', 'Block')}
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
      </div>

      {/* The actions close the detail under a hairline. */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sm,
          marginTop: spacing.md,
          paddingTop: spacing.md,
          borderTop: `${borderWidth.thin}px solid ${t.border.hairline}`,
        }}
      >
        <ExplorerLinkButton
          txHash={transaction.id}
          blockchain={explorerBlockchain}
          environment={explorerEnvironment}
          showMenu
          onPress={() => onViewExplorer?.(transaction)}
        />
        {onShare && (
          <TextButton
            testID="tx-detail-share-button"
            onPress={handleShare}
            icon={<ShareNetworkIcon size={iconSize.sm} color={t.text.accent} />}
          >
            {translate('transactions.detail.share', 'Share')}
          </TextButton>
        )}
      </div>
    </div>
  );
}
