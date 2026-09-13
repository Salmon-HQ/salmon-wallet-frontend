/**
 * FactsCard — a card of facts under an optional bold title.
 *
 * The DOM twin is `packages/ui/src/components/FactsCard`. A Kamino position,
 * a review's data block and a receipt's fine print are the same object: one
 * heading line, then `KeyValueRow`s. Whoever composes facts passes them;
 * nobody draws the title line again.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fontFamilyNative, fontSize, lineHeight, s, spacing, type Semantic } from '@salmon/shared';

import { useThemedStyles } from '../../theme/useThemedStyles';
import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import type { FactsCardProps } from './types';

export function FactsCard({ title, rows, style, testID }: FactsCardProps) {
  const styles = useThemedStyles(stylesFor);

  return (
    <Card padding="lg" gap={spacing.md} style={style} testID={testID}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {rows.map(({ key, ...row }) => (
        <KeyValueRow key={key} {...row} />
      ))}
    </Card>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    title: {
      fontSize: s(fontSize.base),
      fontFamily: fontFamilyNative.bold,
      color: t.text.primary,
      lineHeight: s(fontSize.base) * lineHeight.condensed,
    },
  });

export default FactsCard;
