/**
 * SearchField — the magnifier pill a list filters itself through.
 *
 * One pill for Powerups Browse and the send flow's token picker, so the two
 * cannot drift: raised ground, full radius, a 44 height, the mono size the
 * `.pen` draws the query in.
 */
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import {
  borderRadius,
  fontFamilyNative,
  fontSize,
  ms,
  s,
  spacing,
  vs,
  type Semantic,
} from '@salmon/shared';

import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { MagnifyingGlassIcon } from '../../icons';
import type { SearchFieldProps } from './types';

/** The pill's magnifier. */
const GLYPH_SIZE = 18;

export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  style,
  testID,
}: SearchFieldProps) {
  const styles = useThemedStyles(stylesFor);
  const { text } = useSemantic();

  return (
    <View style={[styles.pill, style]}>
      <MagnifyingGlassIcon size={ms(GLYPH_SIZE)} color={text.secondary} />
      <TextInput
        testID={testID}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={text.tertiary}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={accessibilityLabel ?? placeholder}
      />
    </View>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.sm),
      paddingHorizontal: s(spacing.lg),
      height: vs(44),
      borderRadius: borderRadius.full,
      backgroundColor: t.surface.raised,
    },
    input: {
      flex: 1,
      padding: 0,
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.mono),
      color: t.text.primary,
    },
  });
