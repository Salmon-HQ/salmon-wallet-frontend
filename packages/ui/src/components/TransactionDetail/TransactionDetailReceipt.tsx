/**
 * The receipt card: who it went to and from, what it cost, and the signature
 * to check it against.
 *
 * The mobile twin is
 * `apps/mobile/src/components/TransactionDetail/TransactionDetailReceipt.tsx`.
 */
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  copyToClipboard,
  fontFamily,
  fontSize,
  fontWeight,
  formatRawAmount,
  getShortAddress,
  lineHeight,
  spacing,
  truncateHash,
  useCopyFeedback,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CheckIcon, CopyIcon, iconSize } from '../../icons';
import { Card } from '../Card';
import { CopyTick } from '../CopyTick';
import { KeyValueRow } from '../KeyValueRow';
import { AddressCopyRow } from '../TransactionHistoryPage/AddressCopyRow';
import type { Transaction } from './types';

/** How much of the signature is shown before it elides. */
const HASH_VISIBLE_CHARS = 8;

export interface TransactionDetailReceiptProps {
  transaction: Transaction;
  onCopyHash?: (hash: string) => void;
}

export function TransactionDetailReceipt({
  transaction,
  onCopyHash,
}: TransactionDetailReceiptProps) {
  const { t: translate } = useTranslation();
  const t = useSemantic();
  const { copied, trigger: showCopied } = useCopyFeedback();

  const handleCopyHash = useCallback(async () => {
    try {
      await copyToClipboard(transaction.id);
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
                label={translate('transactions.from', 'From')}
                address={token.source}
                truncate="medium"
              />
            ) : null
          )}
          {transaction.outputs.map((token, index) =>
            token.destination ? (
              <AddressCopyRow
                key={`to-${index}`}
                label={translate('transactions.to', 'To')}
                address={token.destination}
                truncate="medium"
              />
            ) : null
          )}
        </>
      )}

      {transaction.feePayer && (
        <KeyValueRow
          label={translate('transactions.detail.feePayer', 'Fee Payer')}
          value={getShortAddress(transaction.feePayer, 4) ?? ''}
          labelWeight={600}
        />
      )}

      {transaction.fee && (
        <KeyValueRow
          label={translate('transactions.detail.networkFee', 'Network Fee')}
          value={`${formatRawAmount(transaction.fee.amount, transaction.fee.decimals)} ${transaction.fee.symbol}`}
          labelWeight={600}
        />
      )}

      {transaction.swapRoute?.totalFee && (
        <KeyValueRow
          label={translate('transactions.detail.swapFee', 'Swap Fee')}
          value={`${transaction.swapRoute.totalFee.amount} ${transaction.swapRoute.totalFee.symbol}`}
          labelWeight={600}
        />
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
        }}
      >
        <span
          style={{
            fontFamily: fontFamily.sans,
            fontSize: fontSize.caption,
            lineHeight: `${fontSize.caption * lineHeight.snug}px`,
            fontWeight: fontWeight.semibold,
            color: t.text.secondary,
          }}
        >
          {translate('transactions.detail.transactionHash', 'Transaction Hash')}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.xs }}>
          {/* Monospace-Is-For-Scanning Rule: a transaction hash is compared
              character by character against an explorer, so it sets in Geist
              Mono at the address size, exactly as the addresses above it do. */}
          <span
            data-testid="tx-detail-hash"
            style={{ fontFamily: fontFamily.mono, fontSize: fontSize.mono, color: t.text.primary }}
          >
            {truncateHash(transaction.id, HASH_VISIBLE_CHARS)}
          </span>
          {/* Same card, same gesture, same ink as the address rows' copy
              control: accent for the affordance, success for the
              confirmation. */}
          <button
            type="button"
            data-testid="tx-detail-copy-hash"
            onClick={() => void handleCopyHash()}
            aria-label={
              copied
                ? translate('actions.copied', 'Copied!')
                : translate('transactions.detail.copyTransactionHash', 'Copy transaction hash')
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: 'inherit',
            }}
          >
            <CopyTick
              copied={copied}
              copy={<CopyIcon size={iconSize.sm} color={t.text.accent} />}
              tick={<CheckIcon size={iconSize.sm} color={t.status.success} />}
            />
          </button>
        </span>
      </div>
    </Card>
  );
}
