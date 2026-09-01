import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ContentLoader, Rect } from '@salmon/shared';
import {
  borderRadius,
  borderWidth,
  componentSizes,
  contentPadding,
  semantic,
  spacing,
} from '@salmon/shared';
import type { DerivedAccountCardSkeletonProps } from './types';

/**
 * Skeleton placeholder for a derived account card.
 * Uses react-content-loader for smooth shimmer animation.
 * Matches DerivedAccountCard layout to prevent layout shift.
 */
const DerivedAccountCardSkeletonComponent: React.FC<DerivedAccountCardSkeletonProps> = ({
  style,
  testID,
  animated = true,
}) => {
  const { t } = useTranslation();
  const checkboxSize = componentSizes.checkboxSize;
  const checkboxMarginRight = spacing.lg;

  // Content area width (screen minus screen padding, card padding, and border)
  const screenWidth = Dimensions.get('window').width;
  const contentStartX = checkboxSize + checkboxMarginRight;
  const cardInnerWidth = screenWidth - 2 * contentPadding.screen - 2 * spacing.lg - 2;
  const contentWidth = cardInnerWidth - contentStartX;

  // Vertical layout — matches loaded card:
  // address (16px) + marginTop (2px) + networkRow (16px, driven by blockchain icon)
  const addressHeight = 16;
  const iconSize = 16;
  const iconGap = 4;
  const gap = 2;
  const pathTextHeight = 12;
  const totalHeight = addressHeight + gap + iconSize;

  return (
    <View style={[styles.card, style]} testID={testID}>
      <ContentLoader
        speed={animated ? 1.5 : 0}
        width={cardInnerWidth}
        height={totalHeight}
        viewBox={`0 0 ${cardInnerWidth} ${totalHeight}`}
        backgroundColor={semantic.skeleton.base}
        foregroundColor={semantic.skeleton.highlight}
        accessibilityLabel={t('accessibility.loading_account_info', 'Loading account information')}
      >
        {/* Checkbox */}
        <Rect
          x="0"
          y={String((totalHeight - checkboxSize) / 2)}
          rx="6"
          ry="6"
          width={String(checkboxSize)}
          height={String(checkboxSize)}
        />

        {/* Address */}
        <Rect
          x={String(contentStartX)}
          y="0"
          rx="4"
          ry="4"
          width={String(contentWidth * 0.55)}
          height={String(addressHeight)}
        />

        {/* Blockchain icon (circle) */}
        <Rect
          x={String(contentStartX)}
          y={String(addressHeight + gap)}
          rx="8"
          ry="8"
          width={String(iconSize)}
          height={String(iconSize)}
        />

        {/* Network · Path text */}
        <Rect
          x={String(contentStartX + iconSize + iconGap)}
          y={String(addressHeight + gap + (iconSize - pathTextHeight) / 2)}
          rx="4"
          ry="4"
          width={String(contentWidth * 0.35)}
          height={String(pathTextHeight)}
        />

        {/* Balance (right aligned) */}
        <Rect
          x={String(cardInnerWidth - 70)}
          y={String((totalHeight - 16) / 2)}
          rx="4"
          ry="4"
          width="70"
          height="16"
        />
      </ContentLoader>
    </View>
  );
};

export const DerivedAccountCardSkeleton = React.memo(DerivedAccountCardSkeletonComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: semantic.surface.raised,
    borderRadius: borderRadius.xl,
    borderWidth: borderWidth.thin,
    borderColor: semantic.border.raised,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
});
