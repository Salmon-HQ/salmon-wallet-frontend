/**
 * PaymentsAskSheet — the form that asks for USDC, on React Native: the
 * amount card with its fiat line, the note, the expiry chips, and the one
 * terminal action at the bottom. Every label and handler arrives composed
 * from the shared hook. DOM twin: `packages/ui/src/components/PaymentsPage/PaymentsAskSheet`.
 */
import React from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet } from 'react-native';
import { s, spacing, useFieldFocus, vs } from '@salmon/shared';

import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { useKeyboardHeight } from '../../../hooks/useKeyboardHeight';
import { AmountEntryCard } from '../AmountEntryCard';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { PrimaryButton } from '../Button';
import { ChipGroup } from '../Chip';
import { KeyValueRow } from '../KeyValueRow';
import { SectionLabel } from '../SectionLabel';
import { TextField } from '../TextInput';
import type { PaymentsAskSheetProps } from './types';

export function PaymentsAskSheet({
  visible,
  onClose,
  onClosed,
  title,
  form,
  style,
  testID = 'payments-ask',
}: PaymentsAskSheetProps) {
  const { spaciousContentBottomPadding } = useBottomSheetChrome();
  const focus = useFieldFocus();
  // The sheet hugs its content, so padding the scroll by the keyboard's
  // height is what lifts the form above it: the sheet grows up to its own
  // ceiling and the rest scrolls. `KeyboardAvoidingView` measured nothing
  // inside the modal.
  const keyboardHeight = useKeyboardHeight();
  const { label, ...createButton } = form.createButton;

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      title={<SheetTitle>{title}</SheetTitle>}
      testID={testID}
      style={style}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={Keyboard.dismiss}
          accessible={false}
          style={[styles.content, { paddingBottom: spaciousContentBottomPadding + keyboardHeight }]}
        >
          <SectionLabel variant="caps">{form.amountLabel}</SectionLabel>
          <AmountEntryCard testID="payments-amount" {...form.amountCard} {...focus} />
          <SectionLabel variant="caps">{form.noteLabel}</SectionLabel>
          <TextField testID="payments-note" {...form.noteField} />
          <SectionLabel variant="caps">{form.expiryLabel}</SectionLabel>
          <ChipGroup testID="payments-expiry" {...form.expiryChips} />
          {form.errorRow && <KeyValueRow testID="payments-error" {...form.errorRow} />}
          <PrimaryButton testID="payments-create" {...createButton} style={styles.create}>
            {label}
          </PrimaryButton>
        </Pressable>
      </ScrollView>
    </BottomSheetContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: s(spacing['2xl']),
    gap: vs(spacing.md),
  },
  create: {
    marginTop: vs(spacing.sm),
  },
});

export default PaymentsAskSheet;
