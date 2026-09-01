/**
 * StateBlock — the empty and failed answer for a list or section, one shape.
 *
 * D9 (research-mobile.md §5): the same title/body/retry block used to be
 * drawn by hand on the Activity screen, Home's token list, the NFTs grid and
 * Powerups — four copies that could (and did) drift in padding, type, and
 * ink. This is the one implementation, composed on `Card` + the kit's text
 * and button primitives, so a caller only ever supplies copy and a retry.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  fontFamilyNative,
  fontSize,
  lineHeight,
  s,
  semantic,
  spacing,
  vs,
} from '@salmon/shared';
import { Card } from '../Card';
import { SecondaryButton } from '../Button';

import type { StateBlockProps } from './types';

export function StateBlock({
  tone,
  title,
  body,
  onRetry,
  retryLabel,
  retryTestID,
  testID,
}: StateBlockProps) {
  return (
    <View
      style={styles.wrapper}
      testID={testID}
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
    >
      <Card tone="surface" padding="xl" gap={spacing.md} style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        {body && <Text style={styles.body}>{body}</Text>}
        {onRetry && (
          <SecondaryButton onPress={onRetry} testID={retryTestID ?? testID}>
            {retryLabel ?? ''}
          </SecondaryButton>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(spacing.xl),
  },
  card: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: s(fontSize.heading),
    lineHeight: s(fontSize.heading) * lineHeight.snug,
    fontFamily: fontFamilyNative.bold,
    color: semantic.text.primary,
    textAlign: 'center',
  },
  body: {
    fontSize: s(fontSize.body),
    lineHeight: s(fontSize.body) * lineHeight.snug,
    fontFamily: fontFamilyNative.medium,
    color: semantic.text.secondary,
    textAlign: 'center',
  },
});
