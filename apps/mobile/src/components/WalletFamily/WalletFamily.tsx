/**
 * WalletFamily — a wallet and the wallets derived from it, tied by a rail.
 *
 * The parent's card first. Each derived card steps in one gutter; a rail in
 * `border.default` leaves the parent's bottom edge, runs down through the
 * gaps, and meets each derived card at a node in `text.accent` with a short
 * tick into the card. The rail ends at the last node. Nothing here collapses:
 * every wallet in the family is a full card, and the family is always open.
 * The DOM twin is `packages/ui/src/components/WalletFamily`.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { borderWidth, componentSizes, s, spacing, vs, type Semantic } from '@salmon/shared';

import { useThemedStyles } from '../../theme/useThemedStyles';
import type { WalletFamilyProps } from './types';

export function WalletFamily({ parent, derived, style, testID }: WalletFamilyProps) {
  const styles = useThemedStyles(stylesFor);

  return (
    <View testID={testID} style={style}>
      {parent}
      {derived.map(({ id, card }, index) => (
        <View key={id} style={styles.branch}>
          <View
            testID={`wallet-rail-${id}`}
            style={[styles.rail, index === derived.length - 1 && styles.railLast]}
          />
          <View style={styles.tick} />
          <View style={styles.node} />
          {card}
        </View>
      ))}
    </View>
  );
}

const stylesFor = (t: Semantic) => {
  const gutter = s(spacing.screenGutter);
  const node = s(componentSizes.walletRailNode);
  return StyleSheet.create({
    // The gap the screen keeps between families is kept inside one too, so a
    // derived card sits at the same distance from its parent as from the next
    // wallet — only the rail says they belong together.
    branch: {
      marginTop: vs(spacing.screenGutter),
      paddingLeft: gutter,
    },
    rail: {
      position: 'absolute',
      left: gutter / 2 - borderWidth.thin / 2,
      top: -vs(spacing.screenGutter),
      bottom: 0,
      width: borderWidth.thin,
      backgroundColor: t.border.default,
    },
    railLast: {
      bottom: '50%',
    },
    tick: {
      position: 'absolute',
      left: gutter / 2,
      top: '50%',
      width: gutter / 2,
      height: borderWidth.thin,
      backgroundColor: t.border.default,
    },
    node: {
      position: 'absolute',
      left: gutter / 2 - node / 2,
      top: '50%',
      marginTop: -node / 2,
      width: node,
      height: node,
      borderRadius: node / 2,
      backgroundColor: t.text.accent,
    },
  });
};
