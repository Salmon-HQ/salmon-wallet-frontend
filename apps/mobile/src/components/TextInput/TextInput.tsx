/**
 * TextField — a `Card` holding a `TextInput`, in React Native.
 *
 * The DOM twin is `packages/ui/src/components/TextInput`. Both platforms drew
 * this shell — a card that happens to hold a field, with the error line under
 * it — and the DOM had it as a component while mobile redrew it at each call
 * site (`AccountNamePanel`, the address-book label, the add-account steps).
 * That is how the fields ended up answering focus differently: each hand-drawn
 * box decided for itself, and most decided nothing.
 *
 * The card takes `accent.ink` while the field is focused and `status.danger`
 * while it is in error, and error outranks focus — a field reporting a fault
 * must keep reporting it while the user is fixing it.
 */
import { TextInput as RNTextInput, StyleSheet, Text, View } from 'react-native';
import {
  borderWidth,
  fontFamilyNative,
  fontSize,
  spacing,
  useFieldFocus,
  type Semantic,
} from '@salmon/shared';

import { Card } from '../Card';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import type { TextFieldProps } from './types';

export function TextField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  error,
  autoFocus,
  maxLength,
  onSubmitEditing,
  mono = false,
  disabled,
  style,
  testID,
}: TextFieldProps) {
  const styles = useThemedStyles(stylesFor);
  const { accent, status, text } = useSemantic();
  const { focused, onFocus, onBlur } = useFieldFocus();

  const edge = error ? status.danger : focused ? accent.ink : undefined;

  return (
    <View style={[styles.container, style]}>
      <Card
        padding="lg"
        accessibilityLabel={accessibilityLabel ?? placeholder}
        style={edge ? { borderColor: edge, borderWidth: borderWidth.thin } : undefined}
      >
        <RNTextInput
          testID={testID}
          style={[styles.input, mono && styles.mono]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={text.tertiary}
          accessibilityLabel={accessibilityLabel ?? placeholder}
          editable={disabled !== true}
          autoFocus={autoFocus}
          maxLength={maxLength}
          onFocus={onFocus}
          onBlur={onBlur}
          onSubmitEditing={onSubmitEditing}
          returnKeyType="done"
          autoCapitalize={mono ? 'none' : undefined}
          autoCorrect={!mono}
        />
      </Card>
      {error ? (
        <Text style={styles.errorText} testID={testID ? `${testID}-error` : undefined}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    container: {
      gap: spacing.sm,
    },
    input: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.regular,
      fontSize: fontSize.bodyLg,
      padding: 0,
    },
    mono: {
      fontFamily: fontFamilyNative.mono,
      fontSize: fontSize.mono,
    },
    errorText: {
      color: t.status.danger,
      fontFamily: fontFamilyNative.regular,
      fontSize: fontSize.caption,
      paddingHorizontal: spacing.xs,
    },
  });
