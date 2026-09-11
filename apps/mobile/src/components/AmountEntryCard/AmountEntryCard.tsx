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
      style={[focused && { borderColor: semantic.accent.ink }, style]}
      testID={testID}
    >
      {/* The field spans the card and centres its text, so the number, the
          placeholder and the wait all sit on one centre line and the card
          never changes shape between them. The input stays mounted while a
          quote loads; the wait floats over it. */}
      <View style={styles.field}>
        <TextInput
          testID={testID ? `${testID}-input` : undefined}
          style={[styles.input, loading && styles.inputHidden]}
          placeholder={placeholder}
          placeholderTextColor={semantic.text.tertiary}
          value={value}
          onChangeText={(text) => onChangeValue(sanitizeDecimalInput(text))}
          onFocus={onFocus}
          onBlur={onBlur}
          editable={editable && !loading}
          keyboardType="decimal-pad"
          autoCorrect={false}
        />
        {loading && (
          <View
            style={styles.loading}
            pointerEvents="none"
            testID={testID ? `${testID}-loading` : undefined}
          >
            <ActivityIndicator size="large" color={semantic.text.secondary} />
          </View>
        )}
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
    field: {
      alignSelf: 'stretch',
      justifyContent: 'center',
    },
    input: {
      ...TABULAR,
      alignSelf: 'stretch',
      fontSize: s(AMOUNT_ENTRY_FONT),
      lineHeight: s(AMOUNT_ENTRY_FONT) * lineHeight.snug,
      fontFamily: fontFamilyNative.bold,
      color: t.text.primary,
      textAlign: 'center',
      paddingVertical: 0,
    },
    inputHidden: {
      opacity: 0,
    },
    loading: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subtext: {
      ...TABULAR,
      alignSelf: 'center',
      fontSize: s(fontSize.mono),
      fontFamily: fontFamilyNative.medium,
      color: t.text.secondary,
    },
  });
