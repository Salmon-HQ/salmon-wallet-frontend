import React from 'react';
import { StyleSheet, View } from 'react-native';
import { s, spacing } from '@salmon/shared';
import type { ValueActionsRowProps } from './types';

export function ValueActionsRow({ leading, actions, style, testID }: ValueActionsRowProps) {
  return (
    <View style={[styles.row, style]} testID={testID}>
      {leading}
      {actions != null && (
        <View style={styles.actions} testID={testID ? `${testID}-actions` : undefined}>
          {actions}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.md),
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.sm),
    marginLeft: 'auto',
  },
});

export default ValueActionsRow;
