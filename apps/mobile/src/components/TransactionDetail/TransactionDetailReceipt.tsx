/**
 * The receipt card: who it went to and from, what it cost, and the signature
 * to check it against.
 *
 * These rows are the same for every transaction type, so they sit below the
 * variant rather than inside it.
 */
import React, { useCallback } from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { CheckIcon, CopyIcon, iconSize } from '../../icons';
import {
  fontFamilyNative,
  fontSize,
  formatRawAmount,
  getShortAddress,
  lineHeight,
  s,
  semantic,
  spacing,
  truncateHash,
} from '@salmon/shared';

import * as Haptics from '../../utils/haptics';
import { useCopyFeedback } from '../../../hooks/useCopyFeedback';
import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import { AddressCopyRow } from '../Activity/AddressCopyRow';
import type { Transaction } from './types';

/** How much of the signature is shown before it elides. */
const HASH_VISIBLE_CHARS = 8;

export interface TransactionDetailReceiptProps {
  transaction: Transaction;
  onCopyHash?: (hash: string) => void;
}

export const TransactionDetailReceipt: React.FC<TransactionDetailReceiptProps> = ({
  transaction,
  onCopyHash,
}) => {
  const { t } = useTranslation();
  const { copied, scale: tickScale, trigger: showCopied } = useCopyFeedback();

  const handleCopyHash = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(transaction.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCopyHash?.(transaction.id);
      showCopied();
    } catch (error) {
      console.warn('Failed to copy hash:', error);
    }
  }, [transaction.id, onCopyHash, showCopied]);

  return (
    <Card padding="lg" gap={spacing.md} testID="tx-detail-addresses">
      {transaction.type !== 'swap' && (
        <>
          {transaction.inputs.map((token, index) =>
            token.source ? (
              <AddressCopyRow
                key={`from-${index}`}
                label={t('transactions.from', 'From')}
                address={token.source}
                truncate="medium"
                style={styles.addressRow}
              />
            ) : null
          )}
          {transaction.outputs.map((token, index) =>
            token.destination ? (
              <AddressCopyRow
                key={`to-${index}`}
                label={t('transactions.to', 'To')}
                address={token.destination}
                truncate="medium"
                style={styles.addressRow}
              />
            ) : null
          )}
        </>
      )}

      {transaction.feePayer && (
        <KeyValueRow
          label={t('transactions.detail.feePayer', 'Fee Payer')}
          value={getShortAddress(transaction.feePayer, 4) ?? ''}
          labelWeight={600}
        />
      )}

      {transaction.fee && (
        <KeyValueRow
          label={t('transactions.detail.networkFee', 'Network Fee')}
          value={`${formatRawAmount(transaction.fee.amount, transaction.fee.decimals)} ${transaction.fee.symbol}`}
          labelWeight={600}
        />
      )}

      {transaction.swapRoute?.totalFee && (
        <KeyValueRow
          label={t('transactions.detail.swapFee', 'Swap Fee')}
          value={`${transaction.swapRoute.totalFee.amount} ${transaction.swapRoute.totalFee.symbol}`}
          labelWeight={600}
        />
      )}

      <View style={styles.hashRow}>
        <Text style={styles.hashLabel}>
          {t('transactions.detail.transactionHash', 'Transaction Hash')}
        </Text>
        <View style={styles.hashValueRow}>
          <Text style={styles.hashValue}>{truncateHash(transaction.id, HASH_VISIBLE_CHARS)}</Text>
          <TouchableOpacity
            testID="tx-detail-copy-hash"
            onPress={handleCopyHash}
            style={styles.copyButton}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel={
              copied
                ? t('actions.copied', 'Copied!')
                : t('transactions.detail.copyTransactionHash', 'Copy transaction hash')
            }
          >
            {/* Same card, same gesture, same ink as the address rows' copy
                control: accent for the affordance, success for the
                confirmation. */}
            {copied ? (
              <Animated.View style={{ transform: [{ scale: tickScale }] }}>
                <CheckIcon size={iconSize.sm} color={semantic.status.success} />
              </Animated.View>
            ) : (
              <CopyIcon size={iconSize.sm} color={semantic.text.accent} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  /** The copy row is a card child now: it draws no ground of its own. */
  addressRow: {
    marginVertical: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  hashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(spacing.md),
  },
  hashLabel: {
    fontSize: s(fontSize.caption),
    lineHeight: s(fontSize.caption) * lineHeight.snug,
    fontFamily: fontFamilyNative.semiBold,
    color: semantic.text.secondary,
  },
  hashValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xs),
  },
  /**
   * Monospace-Is-For-Scanning Rule: a transaction hash is compared character
   * by character against an explorer, so it sets in Geist Mono at the address
   * size, exactly as the addresses above it do.
   */
  hashValue: {
    fontSize: s(fontSize.mono),
    fontFamily: fontFamilyNative.mono,
    color: semantic.text.primary,
  },
  copyButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TransactionDetailReceipt;
