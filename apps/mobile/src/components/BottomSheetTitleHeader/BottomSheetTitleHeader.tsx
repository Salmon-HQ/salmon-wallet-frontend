import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CaretLeftIcon } from '../../icons';
import {
  componentSizes,
  fontFamilyNative,
  fontSize,
  letterSpacing,
  ms,
  s,
  semantic,
  spacing,
  vs,
} from '@salmon/shared';

import type { BottomSheetTitleHeaderProps } from './types';

export function BottomSheetTitleHeader({
  title,
  onBack,
  backAccessibilityLabel,
  titleNumberOfLines = 1,
  style,
  titleStyle,
}: BottomSheetTitleHeaderProps) {
  const { t } = useTranslation();
  const resolvedBackLabel = backAccessibilityLabel ?? t('general.back', 'Back');
  return (
    <View style={[styles.container, style]}>
      {onBack && (
        <TouchableOpacity
          testID="screen-header-back-button"
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={resolvedBackLabel}
          accessibilityRole="button"
        >
          <CaretLeftIcon size={ms(componentSizes.iconSizeMedium)} color={semantic.text.primary} />
        </TouchableOpacity>
      )}
      <View pointerEvents="none" style={styles.titleContainer}>
        <Text style={[styles.title, titleStyle]} numberOfLines={titleNumberOfLines}>
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: ms(componentSizes.iconSizeMedium),
    justifyContent: 'center',
    paddingHorizontal: s(spacing.xl),
    marginBottom: vs(spacing.lg),
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: s(spacing.xl),
    zIndex: 1,
  },
  titleContainer: {
    position: 'absolute',
    left: s(spacing.xl) + ms(componentSizes.iconSizeMedium),
    right: s(spacing.xl) + ms(componentSizes.iconSizeMedium),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: ms(fontSize.title),
    fontFamily: fontFamilyNative.bold,
    color: semantic.text.primary,
    textAlign: 'center',
    letterSpacing: ms(letterSpacing.snug, 0.3),
  },
});
