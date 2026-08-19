import React, { memo } from 'react';
import { View, Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import {
  colors,
  spacing,
  borderRadius,
  borderWidth,
  contentPadding,
  fontFamilyNative,
  fontSize,
  letterSpacing,
  opacity,
  semantic,
} from '@salmon/shared';
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
        const isActive = account.index === activeIndex;
        const isPending = pendingIndex !== undefined && account.index === pendingIndex;
        return (
          <Pressable
            key={account.index}
            onPress={() => onSelect(account.index)}
            style={[
              styles.chip,
              isActive ? styles.chipActive : styles.chipInactive,
              isPending && styles.chipPending,
            ]}
            disabled={isPending}
            testID={testID ? `${testID}-chip-${account.index}` : undefined}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={colors.text.secondary} />
            ) : (
              <Text
                style={[
                  styles.chipText,
                  isActive ? styles.chipTextActive : styles.chipTextInactive,
                ]}
              >
                #{account.index}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: contentPadding.screen,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  chipActive: {
    backgroundColor: colors.background.card,
    borderWidth: borderWidth.thin,
    borderColor: semantic.state.selectedEdge,
  },
  chipInactive: {
    backgroundColor: colors.card.background,
    borderWidth: borderWidth.tokenListItem,
    borderColor: colors.card.border,
  },
  chipPending: {
    opacity: opacity.low,
  },
  chipText: {
    fontSize: fontSize.sm,
    letterSpacing: letterSpacing.label,
  },
  chipTextActive: {
    fontFamily: fontFamilyNative.medium,
    color: colors.text.primary,
  },
  chipTextInactive: {
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
  },
});
