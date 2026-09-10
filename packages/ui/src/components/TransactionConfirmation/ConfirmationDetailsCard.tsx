/**
 * ConfirmationDetailsCard — the confirmation's detail rows grouped into ONE
 * card, on the DOM. Advanced rows fold behind a "Details" disclosure,
 * collapsed by default, so the critical rows and the warning stay on screen.
 * The mobile twin is
 * `apps/mobile/src/components/TransactionConfirmation/ConfirmationDetailsCard.tsx`.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { componentSizes, fontFamily, fontSize, fontWeight, spacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CaretDownIcon } from '../../icons';
import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import { PendingValue } from '../PendingValue';
import type { ConfirmationDetailsCardProps, ConfirmationRow } from './types';

function DetailRow({ label, value, pending = false }: ConfirmationRow) {
  return (
    <KeyValueRow
      label={label}
      value={
        <PendingValue pending={pending}>
          <span>{value}</span>
        </PendingValue>
      }
    />
  );
}

export function ConfirmationDetailsCard({
  rows,
  advancedRows = [],
  style,
}: ConfirmationDetailsCardProps) {
  const { t } = useTranslation();
  const semantic = useSemantic();
  const [isExpanded, setIsExpanded] = useState(false);
  const hasAdvanced = advancedRows.length > 0;

  return (
    <Card
      padding="lg"
      gap={spacing.md}
      radius="xl"
      style={style}
      testID="confirmation-details-card"
    >
      {rows.map((row) => (
        <DetailRow key={row.label} {...row} />
      ))}
      {hasAdvanced && (
        <>
          <button
            type="button"
            data-testid="confirmation-details-disclosure"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((expanded) => !expanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: 0,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontFamily: fontFamily.sans,
              fontSize: fontSize.bodyLg,
              fontWeight: fontWeight.medium,
              color: semantic.text.primary,
            }}
          >
            <span>{t('confirmation.details', 'Details')}</span>
            <span
              aria-hidden
              style={{
                display: 'inline-flex',
                transform: isExpanded ? 'rotate(180deg)' : undefined,
              }}
            >
              <CaretDownIcon size={componentSizes.iconSizeSmall} color={semantic.text.secondary} />
            </span>
          </button>
          {isExpanded && advancedRows.map((row) => <DetailRow key={row.label} {...row} />)}
        </>
      )}
    </Card>
  );
}
