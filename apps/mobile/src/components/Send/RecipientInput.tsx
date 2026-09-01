/**
 * RecipientInput — the address field of CORE 04.
 *
 * The field itself is the one the send sheet always drew: a mono input (an
 * address is a position-critical string, and a proportional face lets two of
 * them look alike), the QR affordance beside it, and the validation state on
 * the edge. What changed is the shell — a `Card` instead of a hand-drawn
 * `BlurContainer`, so the field wears the same object every other block on the
 * screen wears.
 *
 * It renders state, it does not compute it: `useAddressValidation` stays in
 * the screen, which is also what decides whether Continue is live.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput } from 'react-native';
import {
  borderWidth,
  fontFamilyNative,
  fontSize,
  s,
  spacing,
  type Semantic,
  type ValidationState,
} from '@salmon/shared';

import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { QrCodeIcon, iconSize } from '../../icons';
import { Card } from '../Card';
import { IconBubble } from '../IconBubble';

export interface RecipientInputProps {
  value: string;
  onChangeText: (value: string) => void;
  onScanPress: () => void;
  scanLabel: string;
  placeholder: string;
  validationState: ValidationState;
  isValidating: boolean;
  testID?: string;
  /**
   * Prefix for the field's own testIDs (`${prefix}-recipient-input`,
   * `${prefix}-scan-button`). Defaults to `'send'` so the send flow and its
   * tests keep their existing ids; the address-book panels pass their own.
   */
  testIDPrefix?: string;
}

/** The edge each validation state paints. `idle`/`loading` keep the hairline. */
const edgeFor = (t: Semantic): Partial<Record<ValidationState, string>> => ({
  valid: t.status.success,
  invalid: t.status.danger,
  warning: t.status.warning,
});

/** The glyph the field shows once an address has been judged. */
const markFor = (
  t: Semantic
): Partial<Record<ValidationState, { glyph: string; color: string }>> => ({
  valid: { glyph: '✓', color: t.status.success },
  invalid: { glyph: '✕', color: t.status.danger },
  warning: { glyph: '⚠', color: t.status.warning },
});

export function RecipientInput({
  value,
  onChangeText,
  onScanPress,
  scanLabel,
  placeholder,
  validationState,
  isValidating,
  testID = 'send-recipient-field',
  testIDPrefix = 'send',
}: RecipientInputProps) {
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();
  const edge = edgeFor(semantic)[validationState];
  const mark = value.length > 0 && !isValidating ? markFor(semantic)[validationState] : undefined;

  return (
    <Card
      testID={testID}
      padding="md"
      style={StyleSheet.flatten([
        styles.field,
        edge != null && { borderColor: edge, borderWidth: borderWidth.thin },
      ])}
    >
      <TextInput
        testID={`${testIDPrefix}-recipient-input`}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={semantic.text.tertiary}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
      />
      {value.length > 0 && isValidating && (
        <ActivityIndicator size="small" color={semantic.text.secondary} />
      )}
      {mark && (
        <Text style={[styles.mark, { color: mark.color }]} testID="send-recipient-mark">
          {mark.glyph}
        </Text>
      )}
      <IconBubble
        testID={`${testIDPrefix}-scan-button`}
        size={36}
        tone="ghost"
        icon={QrCodeIcon}
        iconSize={iconSize.md}
        onPress={onScanPress}
        accessibilityLabel={scanLabel}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      />
    </Card>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.sm),
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: s(fontSize.mono),
    fontFamily: fontFamilyNative.mono,
    color: t.text.primary,
    paddingVertical: 0,
  },
  mark: {
    fontSize: s(fontSize.bodyLg),
    fontFamily: fontFamilyNative.bold,
  },
});
