/**
 * The developer-mode card: the raw shape of the transaction as the indexer
 * reported it — Helius type, account count, programs, inner swaps, fees.
 *
 * Only reachable with developer mode on, so it stays out of the shell.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CodeIcon, iconSize } from '../../icons';
import { getShortAddress, s, spacing } from '@salmon/shared';

import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import { SectionLabel } from '../SectionLabel';
import { useSemantic } from '../../theme/useThemedStyles';
import type { Transaction } from './types';

export interface TransactionDetailDeveloperProps {
  transaction: Transaction;
}

export const TransactionDetailDeveloper: React.FC<TransactionDetailDeveloperProps> = ({
  transaction,
}) => {
  const { t } = useTranslation();
  const { text } = useSemantic();

  return (
    <Card padding="lg" gap={spacing.md} testID="tx-detail-developer">
      <View style={styles.header}>
        <CodeIcon size={iconSize.sm} color={text.secondary} />
        <SectionLabel variant="caps">
          {t('transactions.detail.developerInfo', 'Developer Info')}
        </SectionLabel>
      </View>

      {transaction.heliusType && (
        <KeyValueRow
          label={t('transactions.detail.heliusType', 'Helius Type')}
          value={transaction.heliusType}
          labelWeight={600}
        />
      )}

      {transaction.accountsInvolved != null && (
        <KeyValueRow
          label={t('transactions.detail.accountsInvolved', 'Accounts Involved')}
          value={String(transaction.accountsInvolved)}
          labelWeight={600}
        />
      )}

      {transaction.instructions && transaction.instructions.length > 0 && (
        <>
          <SectionLabel variant="caps">
            {t('transactions.detail.programs', 'Programs')}
          </SectionLabel>
          {transaction.instructions.map((ix, index) => (
            <KeyValueRow
              key={`ix-${index}`}
              label={getShortAddress(ix.programId, 6) ?? ''}
              value={
                ix.innerInstructionsCount > 0
                  ? t('transactions.detail.innerCount', {
                      count: ix.innerInstructionsCount,
                      defaultValue: '{{count}} inner',
                    })
                  : ''
              }
              valueTone="secondary"
            />
          ))}
        </>
      )}

      {transaction.innerSwaps && transaction.innerSwaps.length > 0 && (
        <>
          <SectionLabel variant="caps">
            {t('transactions.detail.innerSwaps', 'Inner Swaps')}
          </SectionLabel>
          {transaction.innerSwaps.map((swap, index) => (
            <KeyValueRow
              key={`inner-${index}`}
              label={swap.programInfo.source}
              value={`${swap.programInfo.programName} / ${swap.programInfo.instructionName}`}
              valueTone="secondary"
            />
          ))}
        </>
      )}

      {transaction.swapFees && (
        <>
          <SectionLabel variant="caps">
            {t('transactions.detail.swapFees', 'Swap Fees')}
          </SectionLabel>
          {transaction.swapFees.nativeFees.map((fee, index) => (
            <KeyValueRow
              key={`nfee-${index}`}
              label={getShortAddress(fee.account, 6) ?? ''}
              value={`${fee.amount} SOL`}
              valueTone="secondary"
            />
          ))}
          {transaction.swapFees.tokenFees.map((fee, index) => (
            <KeyValueRow
              key={`tfee-${index}`}
              label={getShortAddress(fee.account, 6) ?? ''}
              value={`${fee.amount} (${getShortAddress(fee.mint, 4) ?? ''})`}
              valueTone="secondary"
            />
          ))}
        </>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xs),
  },
});

export default TransactionDetailDeveloper;
