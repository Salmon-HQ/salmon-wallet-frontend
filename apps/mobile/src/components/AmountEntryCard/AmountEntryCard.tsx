/**
 * AmountEntryCard — the big centred amount card, hoisted out of Send's
 * amount step (`app/(app)/send/amount.tsx`, CORE 05) so Swap's input form
 * (`SwapScreen/SwapInputScreen.tsx`) draws the same card instead of its own.
 * DOM twin: `packages/ui/src/components/AmountEntryCard/AmountEntryCard.tsx`.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  fontFamilyNative,
  fontSize,
  lineHeight,
  s,
  sanitizeDecimalInput,
  spacing,
  tabularNums,
  type Semantic,
} from '@salmon/shared';

import { Card } from '../Card';
import { useThemedStyles, useSemantic } from '../../theme/useThemedStyles';
import type { AmountEntryCardProps } from './types';

// `tabularNums.native` types its array as readonly; RN's TextStyle wants a
// mutable one.
const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

/** The amount being typed, at the size the frames draw it (CORE 05, 46/700). */
const AMOUNT_ENTRY_FONT = 46;

export function AmountEntryCard({
  value,
  onChangeValue,
  editable = true,
  placeholder = '0',
  trailing,
  subtext,
  loading = false,
  focused = false,
  onFocus,
  onBlur,
  style,
  testID,
}: AmountEntryCardProps) {
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();

  return (
    <Card
      padding="lg"
      gap={spacing.base}
      style={[styles.card, focused && { borderColor: semantic.accent.ink }, style]}
      testID={testID}
    >
      <View style={styles.row}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={semantic.text.secondary} />
          </View>
        ) : (
          <TextInput
            testID={testID ? `${testID}-input` : undefined}
            style={[styles.input, !trailing && styles.inputCentered]}
            placeholder={placeholder}
            placeholderTextColor={semantic.text.tertiary}
            value={value}
            onChangeText={(text) => onChangeValue(sanitizeDecimalInput(text))}
            onFocus={onFocus}
            onBlur={onBlur}
            editable={editable}
            keyboardType="decimal-pad"
            autoCorrect={false}
          />
        )}
        {trailing}
      </View>
      {subtext !== undefined && (
        <Text style={styles.subtext} testID={testID ? `${testID}-fiat` : undefined}>
          {subtext}
        </Text>
      )}
    </Card>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    card: {
      alignItems: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: s(spacing.sm),
    },
    loading: {
      flex: 1,
      alignItems: 'flex-end',
    },
    input: {
      ...TABULAR,
      flex: 1,
      minWidth: s(80),
      fontSize: s(AMOUNT_ENTRY_FONT),
      lineHeight: s(AMOUNT_ENTRY_FONT) * lineHeight.snug,
      fontFamily: fontFamilyNative.bold,
      color: t.text.primary,
      textAlign: 'right',
      paddingVertical: 0,
    },
    // No trailing control: the card holds the number alone, so it centres
    // rather than right-aligning next to nothing.
    inputCentered: {
      textAlign: 'center',
    },
    subtext: {
      ...TABULAR,
      fontSize: s(fontSize.mono),
      fontFamily: fontFamilyNative.medium,
      color: t.text.secondary,
    },
  });
