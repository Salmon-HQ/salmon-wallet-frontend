/**
 * DataAttribution — the data provider's credit, once per screen that shows
 * its prices or token list (Portfolio, the swap picker, the confirmation).
 * Text and link come from the backend's network entry and are drawn
 * verbatim; the provider's terms fix the floor at 10pt, and `fontSize.sm`
 * sits above it. Nothing is drawn for a network that owes no credit.
 *
 * The DOM twin is `packages/ui/src/components/DataAttribution`.
 */
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import {
  colors,
  fontFamilyNative,
  fontSize,
  ms,
  opacity,
  spacing,
  useDataAttribution,
  useOpenLink,
  vs,
} from '@salmon/shared';

import type { DataAttributionProps } from './types';

export function DataAttribution({
  networkId,
  style,
  testID = 'data-attribution',
}: DataAttributionProps) {
  const attribution = useDataAttribution(networkId);
  const openLink = useOpenLink();

  if (!attribution) return null;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="link"
      accessibilityLabel={attribution.text}
      onPress={() => void openLink(attribution.url)}
      style={[styles.container, style]}
    >
      <Text style={styles.text}>{attribution.text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    paddingVertical: vs(spacing.sm),
    paddingHorizontal: spacing.md,
  },
  text: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.tertiary,
    opacity: opacity.soft,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

export default DataAttribution;
