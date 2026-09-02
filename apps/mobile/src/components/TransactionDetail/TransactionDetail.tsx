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
import {
  CheckCircleIcon,
  ClockIcon,
  ShareNetworkIcon,
  XCircleIcon,
  iconSize,
  type IconComponent,
} from '../../icons';
import {
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  formatBlockNumber,
  formatDateTime,
  getBlockchainFromNetworkId,
  lineHeight,
  s,
  spacing,
  vs,
  type Blockchain,
  type NetworkEnvironment,
  type Semantic,
  CONFIRMATION_CONFIG,
  CONFIRMATION_LABEL_KEYS,
  STATUS_LABEL_KEYS,
  conversionRateFor,
  transactionStatusDisplayFor,
} from '@salmon/shared';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../Card';
import { Chip } from '../Chip';
import { IconBubble } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
import { TextButton } from '../Button';
import { ExplorerLinkButton } from '../Activity/ExplorerLinkButton';
import { transactionTypeConfigFor, TYPE_LABEL_KEYS } from '../Activity/transactionTypes';
import { TransactionDetailDeveloper } from './TransactionDetailDeveloper';
import { TransactionDetailReceipt } from './TransactionDetailReceipt';
import { TransactionDetailSwap } from './TransactionDetailSwap';
import { TransactionDetailTransfer } from './TransactionDetailTransfer';
import { useThemedStyles, useSemantic } from '../../theme/useThemedStyles';
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
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();
  const STATUS_CONFIG = useMemo(() => statusConfigFor(semantic), [semantic]);
  const TRANSACTION_TYPE_CONFIG = useMemo(() => transactionTypeConfigFor(semantic), [semantic]);

  const handleShare = useCallback(() => {
    if (transaction && onShare) {
      onShare(transaction);
    }
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

  if (!transaction) {
    return null;
  }

  // Derive explorer target from the active network (the same pattern the send
  // and NFT flows use) instead of hardcoding Solana mainnet.
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

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    container: {
      flexShrink: 1,
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
      color: t.text.primary,
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
      flexGrow: 0,
      flexShrink: 1,
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
      borderTopColor: t.border.hairline,
    },
  });

export default TransactionDetail;
