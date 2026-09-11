/**
 * The developer-mode card: the raw shape of the transaction as the indexer
 * reported it — Helius type, account count, programs, inner swaps, fees.
 *
 * Only reachable with developer mode on, so it stays out of the shell. The
 * mobile twin is
 * `apps/mobile/src/components/TransactionDetail/TransactionDetailDeveloper.tsx`.
 * The sections/rows come from `buildTransactionDeveloperSections` (shared
 * with that twin) — this file only renders them.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { buildTransactionDeveloperSections, spacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CodeIcon, iconSize } from '../../icons';
import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import { SectionLabel } from '../SectionLabel';
import type { Transaction } from './types';

export interface TransactionDetailDeveloperProps {
  transaction: Transaction;
}

export function TransactionDetailDeveloper({ transaction }: TransactionDetailDeveloperProps) {
  const { t } = useTranslation();
  const { text } = useSemantic();
  const sections = buildTransactionDeveloperSections(transaction, t);

  return (
    <Card padding="lg" gap={spacing.md} testID="tx-detail-developer">
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
        <CodeIcon size={iconSize.sm} color={text.secondary} />
        <SectionLabel variant="caps">
          {t('transactions.detail.developerInfo', 'Developer Info')}
        </SectionLabel>
      </div>

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
}
