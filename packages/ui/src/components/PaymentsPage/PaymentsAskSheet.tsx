/**
 * PaymentsAskSheet — the form that asks for USDC, on the DOM: the amount
 * card with its fiat line, the note, the expiry chips, and the one terminal
 * action at the bottom. Every label and handler arrives composed from the
 * shared hook. Mobile twin: `apps/mobile/src/components/PaymentsScreen/PaymentsAskSheet`.
 */
import React from 'react';
import { spacing, useFieldFocus } from '@salmon/shared';

import { AmountEntryCard } from '../AmountEntryCard';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { PrimaryButton } from '../Button';
import { ChipGroup } from '../Chip';
import { KeyValueRow } from '../KeyValueRow';
import { SectionLabel } from '../SectionLabel';
import { TextInput } from '../TextInput';
import type { PaymentsAskSheetProps } from './types';

export function PaymentsAskSheet({
  visible,
  onClose,
  onClosed,
  title,
  form,
  className,
  style,
  testID = 'payments-ask',
}: PaymentsAskSheetProps) {
  const focus = useFieldFocus();
  const { label, ...createButton } = form.createButton;

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      title={<SheetTitle>{title}</SheetTitle>}
      testID={testID}
      className={className}
      style={style}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: spacing['2xl'],
          gap: spacing.md,
        }}
      >
        <SectionLabel variant="caps">{form.amountLabel}</SectionLabel>
        <AmountEntryCard testID="payments-amount" {...form.amountCard} {...focus} />
        <SectionLabel variant="caps">{form.noteLabel}</SectionLabel>
        <TextInput testID="payments-note" {...form.noteField} />
        <SectionLabel variant="caps">{form.expiryLabel}</SectionLabel>
        <ChipGroup testID="payments-expiry" {...form.expiryChips} />
        {form.errorRow && <KeyValueRow testID="payments-error" {...form.errorRow} />}
        <PrimaryButton testID="payments-create" {...createButton} style={{ marginTop: spacing.sm }}>
          {label}
        </PrimaryButton>
      </div>
    </BottomSheetContainer>
  );
}
