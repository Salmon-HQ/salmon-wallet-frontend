/**
 * PaymentsAskSheet — the form that asks for USDC, on React Native: the
 * amount card with its fiat line, the note, the expiry chips, and the one
 * terminal action at the bottom. Every label and handler arrives composed
 * from the shared hook. DOM twin: `packages/ui/src/components/PaymentsPage/PaymentsAskSheet`.
 */
import React from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  fontFamilyNative,
  fontSize,
  lineHeight,
  s,
  spacing,
  useFieldFocus,
  vs,
  type Semantic,
} from '@salmon/shared';

import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { useKeyboardHeight } from '../../../hooks/useKeyboardHeight';
import { useThemedStyles } from '../../theme/useThemedStyles';
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
  description,
  form,
  height,
  style,
  testID = 'payments-ask',
}: PaymentsAskSheetProps) {
  const styles = useThemedStyles(stylesFor);
  const { actionRowBottomPadding } = useBottomSheetChrome();
  const focus = useFieldFocus();
  // The sheet stands at its full height from the start; the keyboard covers
  // the form, and the action row rides on top of it like every CTA in the app.
  const keyboardHeight = useKeyboardHeight();
  const { label, ...createButton } = form.createButton;
  const footerBottomInset =
    keyboardHeight > 0 ? keyboardHeight + vs(spacing.sm) : actionRowBottomPadding;

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      height={height}
      headerContent={
        <View style={styles.header}>
          <SheetTitle>{title}</SheetTitle>
          <Text testID="payments-ask-description" style={styles.description}>
            {description}
          </Text>
        </View>
      }
      testID={testID}
      style={style}
    >
      <View style={layout.body}>
        <ScrollView
          style={layout.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={Keyboard.dismiss} accessible={false} style={layout.content}>
            <SectionLabel variant="caps">{form.amountLabel}</SectionLabel>
            <AmountEntryCard testID="payments-amount" {...form.amountCard} {...focus} />
            <SectionLabel variant="caps">{form.noteLabel}</SectionLabel>
            <TextField testID="payments-note" {...form.noteField} />
            <SectionLabel variant="caps">{form.expiryLabel}</SectionLabel>
            <ChipGroup testID="payments-expiry" {...form.expiryChips} />
            {form.errorRow && <KeyValueRow testID="payments-error" {...form.errorRow} />}
          </Pressable>
        </ScrollView>
        <View style={[layout.footer, { paddingBottom: footerBottomInset }]}>
          <PrimaryButton testID="payments-create" {...createButton}>
            {label}
          </PrimaryButton>
        </View>
      </View>
    </BottomSheetContainer>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    header: {
      alignItems: 'center',
      gap: vs(spacing.xs),
      paddingHorizontal: s(spacing['2xl']),
    },
    description: {
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.snug,
      color: t.text.secondary,
      textAlign: 'center',
    },
  });

const layout = StyleSheet.create({
  body: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: s(spacing['2xl']),
    paddingTop: vs(spacing.screenGutter),
    paddingBottom: vs(spacing.md),
    gap: vs(spacing.md),
  },
  footer: {
    paddingHorizontal: s(spacing['2xl']),
    paddingTop: vs(spacing.sm),
  },
});

export default PaymentsAskSheet;
