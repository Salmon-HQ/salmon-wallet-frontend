/**
 * SubAccountSelector — the derived accounts (path indexes) one wallet holds.
 *
 * The chips are the kit's `Chip`, not a second pill drawn by hand: a derived
 * account is a filter over one wallet, which is exactly what `Chip`'s `filter`
 * variant says. The only thing this component still owns is the row and the
 * pending spinner a chip cannot carry.
 */
import React, { memo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, contentPadding, s, spacing } from '@salmon/shared';

import { Chip } from '../Chip';
import type { SubAccountSelectorProps } from './types';

export const SubAccountSelector = memo(function SubAccountSelector({
  accounts,
  activeIndex,
  onSelect,
  pendingIndex,
  style,
  testID,
}: SubAccountSelectorProps) {
  if (accounts.length < 2) return null;

  return (
    <View style={[styles.container, style]} testID={testID}>
      {accounts.map((account) => {
        const isPending = pendingIndex !== undefined && account.index === pendingIndex;
        if (isPending) {
          return (
            <View key={account.index} style={styles.pending}>
              <ActivityIndicator size="small" color={colors.text.secondary} />
            </View>
          );
        }
        return (
          <Chip
            key={account.index}
            testID={testID ? `${testID}-chip-${account.index}` : undefined}
            label={`#${account.index}`}
            selected={account.index === activeIndex}
            onPress={() => onSelect(account.index)}
            size="md"
            variant="filter"
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // The screen gutter its first consumer (the NFTs tab) draws it inside.
    // A consumer that owns its own gutter overrides this with `style`.
    paddingHorizontal: contentPadding.screen,
    gap: s(spacing.sm),
  },
  pending: {
    paddingHorizontal: s(spacing.md),
    paddingVertical: s(spacing.xs),
  },
});
