/**
 * The developer-mode card: the raw shape of the transaction as the indexer
 * reported it — Helius type, account count, programs, inner swaps, fees.
 *
 * Only reachable with developer mode on, so it stays out of the shell. The
 * sections/rows come from `buildTransactionDeveloperSections` (shared with
 * the DOM twin) — this file only renders them.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CodeIcon, iconSize } from '../../icons';
import { buildTransactionDeveloperSections, s, spacing } from '@salmon/shared';

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
  const sections = buildTransactionDeveloperSections(transaction, t);

  return (
    <Card padding="lg" gap={spacing.md} testID="tx-detail-developer">
      <View style={styles.header}>
        <CodeIcon size={iconSize.sm} color={text.secondary} />
        <SectionLabel variant="caps">
          {t('transactions.detail.developerInfo', 'Developer Info')}
        </SectionLabel>
      </View>

      {sections.map((section) => (
        <React.Fragment key={section.key}>
          {section.title && <SectionLabel variant="caps">{section.title}</SectionLabel>}
          {section.rows.map((row) => (
            <KeyValueRow
              key={row.key}
              label={row.label}
              value={row.value}
              valueTone={row.valueTone}
              labelWeight={row.labelWeight}
            />
          ))}
        </React.Fragment>
      ))}
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
