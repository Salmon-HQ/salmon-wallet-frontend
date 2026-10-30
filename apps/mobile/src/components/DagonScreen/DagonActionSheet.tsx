/**
 * DagonActionSheet — Hide, Send, Swap and Withdraw on React Native: the
 * token, the amount with its fills, the recipient for a send, the facts and
 * the warning, and the one action that hands core the request. Composed from
 * the runbook blocks only (`docs/POWERUPS-UI.md` §1.3-§1.5, §1.9, §1.10);
 * core draws the confirmation, the wait and the receipt.
 */
import React from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { s, spacing, useFieldFocus, vs } from '@salmon/shared';

import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { useKeyboardLift } from '../../../hooks/useKeyboardHeight';
import { useSemantic } from '../../theme/useThemedStyles';
import { CaretRightIcon, iconSize } from '../../icons';
import { AmountEntryCard } from '../AmountEntryCard';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { PrimaryButton } from '../Button';
import { ChipGroup } from '../Chip';
import { FactsCard } from '../FactsCard';
import { ListRow } from '../ListRow';
import { SectionLabel } from '../SectionLabel';
import { TextField } from '../TextInput';
import { TokenLogo } from '../TokenLogo';
import { TokenPickerSheet } from '../TokenPickerSheet';
import { WarningNotice } from '../WarningNotice';
import type { DagonActionSheetProps } from './types';

export function DagonActionSheet({ sheet, height, testID = 'dagon-sheet' }: DagonActionSheetProps) {
  const { actionRowBottomPadding } = useBottomSheetChrome();
  const semantic = useSemantic();
  const focus = useFieldFocus();
  const footerLift = useKeyboardLift(actionRowBottomPadding, vs(spacing.sm));
  const { label: submitLabel, ...submit } = sheet.submit;

  return (
    <BottomSheetContainer
      visible={sheet.visible}
      onClose={sheet.onClose}
      height={height}
      title={<SheetTitle>{sheet.title}</SheetTitle>}
      testID={testID}
    >
      <View style={layout.body}>
        <ScrollView
          style={layout.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={Keyboard.dismiss} accessible={false} style={layout.content}>
            <View style={layout.field}>
              <SectionLabel variant="caps">{sheet.tokenLabel}</SectionLabel>
              <ListRow
                testID={`${testID}-token`}
                title={sheet.token.name}
                subtitle={sheet.token.hint}
                onPress={sheet.token.onPress}
                accessibilityRole="button"
                leading={<TokenLogo symbol={sheet.token.side} size={s(38)} />}
                trailing={<CaretRightIcon size={iconSize.md} color={semantic.text.tertiary} />}
              />
            </View>
            <View style={layout.field}>
              <SectionLabel variant="caps">{sheet.amountLabel}</SectionLabel>
              <AmountEntryCard
                testID={`${testID}-amount`}
                value={sheet.amount}
                onChangeValue={sheet.onChangeAmount}
                placeholder="0"
                maxDecimals={2}
                {...focus}
              />
              <ChipGroup
                testID={`${testID}-shortcuts`}
                variant="outline"
                options={sheet.shortcuts.options}
                value={sheet.shortcuts.value}
                onChange={sheet.shortcuts.onChange}
              />
            </View>
            {sheet.recipient && (
              <View style={layout.field}>
                <SectionLabel variant="caps">{sheet.recipient.label}</SectionLabel>
                <TextField
                  testID={`${testID}-recipient`}
                  value={sheet.recipient.value}
                  onChangeText={sheet.recipient.onChangeText}
                  placeholder={sheet.recipient.placeholder}
                  error={sheet.recipient.error}
                  mono
                />
              </View>
            )}
            {sheet.facts.length > 0 && <FactsCard testID={`${testID}-facts`} rows={sheet.facts} />}
            {sheet.warning && (
              <WarningNotice tone="warning" title={sheet.warning} testID={`${testID}-warning`} />
            )}
            {sheet.error && (
              <WarningNotice tone="error" title={sheet.error} testID={`${testID}-error`} />
            )}
          </Pressable>
        </ScrollView>
        <Animated.View style={[layout.footer, footerLift]}>
          <PrimaryButton testID={`${testID}-submit`} {...submit}>
            {submitLabel}
          </PrimaryButton>
        </Animated.View>
      </View>
      {/* One pick among the two mock tokens, risen from this sheet. */}
      <TokenPickerSheet
        testID={`${testID}-picker`}
        {...sheet.picker}
        loading={false}
        showBalances={false}
        verifiedOnly={false}
      />
    </BottomSheetContainer>
  );
}

const layout = StyleSheet.create({
  body: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: s(spacing.screenGutter),
    paddingTop: vs(spacing.md),
    paddingBottom: vs(spacing.md),
    gap: vs(spacing.xl),
  },
  field: {
    gap: vs(spacing.md),
  },
  footer: {
    paddingHorizontal: s(spacing.screenGutter),
    paddingTop: vs(spacing.sm),
  },
});

export default DagonActionSheet;
