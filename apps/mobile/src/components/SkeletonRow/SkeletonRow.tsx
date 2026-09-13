/**
 * SkeletonRow — the composed skeleton atom.
 *
 * Every hand-rolled `ContentLoader` skeleton in the kit stood in for a
 * `ListRow`: leading mark, one or two title lines, an optional trailing
 * value. This draws that shape once, as a `Card` at the row's own padding
 * built from `ShimmerRect` (D1, research-mobile.md §2), so a skeleton's
 * geometry matches the real row it stands in for instead of an SVG traced
 * from a screenshot. `ShimmerRect` is already reduce-motion aware, so this
 * atom is too.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { s, spacing, vs } from '@salmon/shared';
import type { SkeletonRowPropsBase } from '@salmon/shared';

import { Card } from '../Card';
import { ShimmerRect } from '../ShimmerRect';

export type SkeletonRowProps = SkeletonRowPropsBase;

const TITLE_LINE_HEIGHT = 16;
const SUBTITLE_LINE_HEIGHT = 13;
const TITLE_WIDTH = 100;
const SUBTITLE_WIDTH = 140;

export function SkeletonRow({
  leadingSize = 40,
  lines = 2,
  trailingWidth,
  count = 1,
  padding = 'md',
  testID,
  accessibilityLabel,
}: SkeletonRowProps) {
  const rows = Array.from({ length: count }, (_, index) => (
    <Card key={index} padding={padding} radius="xl" style={styles.row}>
      <ShimmerRect
        width={s(leadingSize)}
        height={s(leadingSize)}
        borderRadius={s(leadingSize) / 2}
      />
      <View style={styles.text}>
        <ShimmerRect width={s(TITLE_WIDTH)} height={vs(TITLE_LINE_HEIGHT)} />
        {lines === 2 && <ShimmerRect width={s(SUBTITLE_WIDTH)} height={vs(SUBTITLE_LINE_HEIGHT)} />}
      </View>
      {trailingWidth != null && (
        <ShimmerRect width={s(trailingWidth)} height={vs(TITLE_LINE_HEIGHT)} />
      )}
    </Card>
  ));

  if (count === 1) {
    return (
      <View testID={testID} accessible accessibilityLabel={accessibilityLabel}>
        {rows[0]}
      </View>
    );
  }

  return (
    <View testID={testID} accessible accessibilityLabel={accessibilityLabel} style={styles.list}>
      {rows}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: vs(spacing.screenGutter),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.md),
  },
  text: {
    flex: 1,
    gap: vs(spacing.xxs),
  },
});
