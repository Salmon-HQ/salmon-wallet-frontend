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
  CONFIRMATION_CONFIG,
  CONFIRMATION_LABEL_KEYS,
  STATUS_LABEL_KEYS,
  conversionRateFor,
  transactionStatusDisplayFor,
  useDeveloperMode,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import {
  CheckCircleIcon,
  ClockIcon,
  ShareNetworkIcon,
  XCircleIcon,
  iconSize,
  type IconComponent,
} from '../../icons';
import { TextButton } from '../Button';
import { Card } from '../Card';
import { IconBubble } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
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

/** The platform's glyph for each shared status name. */
const STATUS_GLYPHS = { checkCircle: CheckCircleIcon, xCircle: XCircleIcon, clock: ClockIcon };

/** The shared status table with this platform's icons. */
const statusConfigFor = (t: Semantic) =>
  Object.fromEntries(
    Object.entries(transactionStatusDisplayFor(t)).map(([status, display]) => [
      status,
      { label: display.label, color: display.color, icon: STATUS_GLYPHS[display.glyph] },
    ])
  ) as Record<
    'completed' | 'failed' | 'pending',
    { label: string; color: string; icon: IconComponent }
  >;

/** The status mark at the head of the detail (CORE 09). */
const STATUS_MARK_SIZE = 48;

export function TransactionDetail({
  transaction,
  onViewExplorer,
  onCopyHash,
  onShare,
  networkId,
  className,
  style,
}: TransactionDetailProps): React.ReactElement | null {
  const { t: translate } = useTranslation();
  // The technical block shows under developer mode — the provider's flag,
  // not a drilled prop.
  const developerMode = useDeveloperMode();
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

  const conversionRate = useMemo(() => conversionRateFor(transaction), [transaction]);

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
          // The sheet gives the sides; the last block gives the floor, as the
          // mobile twin's actions row does with its own bottom padding.
          paddingBottom: spacing.lg,
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
