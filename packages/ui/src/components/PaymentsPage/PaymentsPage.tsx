/**
 * PaymentsPage — the Payments Powerup on the DOM: the form that asks for
 * USDC, the list of what was asked, and the sheet that shows one request as
 * a code. Every prop is composed in the shared hook; this file only renders.
 * Mobile twin: `apps/mobile/src/components/PaymentsScreen`.
 */
import React, { useCallback, useState } from 'react';
import { componentSizes, spacing } from '@salmon/shared';
import { usePaymentsScreenLogic } from '@salmon/shared/powerups';

import { powerupIcons } from '../../icons';
import { AmountEntryCard } from '../AmountEntryCard';
import { PrimaryButton } from '../Button';
import { ChipGroup } from '../Chip';
import { IconBubble } from '../IconBubble';
import { KeyValueRow } from '../KeyValueRow';
import { ListRow } from '../ListRow';
import { SectionLabel } from '../SectionLabel';
import { StateBlock } from '../StateBlock';
import { TextInput } from '../TextInput';
import { PaymentRequestSheet } from './PaymentRequestSheet';
import type { PaymentsPageProps } from './types';

const column = (gap: number): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap,
});

export function PaymentsPage({
  style,
  testID = 'payments-screen',
  ...logicParams
}: PaymentsPageProps) {
  const { form, list, sheet, unavailable } = usePaymentsScreenLogic(logicParams);
  const [focused, setFocused] = useState(false);
  const onFocus = useCallback(() => setFocused(true), []);
  const onBlur = useCallback(() => setFocused(false), []);

  const root: React.CSSProperties = {
    ...column(spacing.screenGutter),
    flex: 1,
    minHeight: 0,
    padding: `0 ${spacing.headerPadding}px ${spacing.screenGutter}px`,
    ...style,
  };

  if (unavailable) {
    return (
      <div data-testid={testID} style={root}>
        <StateBlock tone="error" testID="payments-unavailable" title={unavailable} />
      </div>
    );
  }

  const { label, ...createButton } = form.createButton;

  return (
    <div data-testid={testID} style={root}>
      <div style={column(spacing.md)}>
        <SectionLabel variant="caps">{form.amountLabel}</SectionLabel>
        <AmountEntryCard
          testID="payments-amount"
          {...form.amountCard}
          focused={focused}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <SectionLabel variant="caps">{form.noteLabel}</SectionLabel>
        <TextInput testID="payments-note" {...form.noteField} />
        <SectionLabel variant="caps">{form.expiryLabel}</SectionLabel>
        <ChipGroup testID="payments-expiry" {...form.expiryChips} />
        {form.errorRow && <KeyValueRow testID="payments-error" {...form.errorRow} />}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: spacing.sm }}>
          <PrimaryButton
            testID="payments-create"
            {...createButton}
            style={{
              width: componentSizes.copyButtonWidth,
              height: componentSizes.buttonHeightCompact,
            }}
          >
            {label}
          </PrimaryButton>
        </div>
      </div>

      <SectionLabel variant="caps">{list.title}</SectionLabel>
      {list.rows.length === 0 ? (
        <StateBlock tone="empty" testID="payments-empty" {...list.empty} />
      ) : (
        <div style={column(spacing.screenGutter)}>
          {list.rows.map((row) => (
            <ListRow
              key={row.id}
              testID={`payments-row-${row.id}`}
              {...row.listRow}
              leading={<IconBubble {...row.bubble} icon={powerupIcons.QrCode} />}
              trailing={<KeyValueRow {...row.trailing} />}
            />
          ))}
        </div>
      )}

      <PaymentRequestSheet testID="payments-sheet" {...sheet} />
    </div>
  );
}
