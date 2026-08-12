import React from 'react';
import { Dimensions, View, StyleSheet, ScrollView } from 'react-native';
import { ContentLoader, Rect } from '@salmon/shared';
import { colors, ms, s, vs, spacing } from '@salmon/shared';
import type { NftCarouselSectionSkeletonProps } from './types';

// Card dimensions for carousel (matches Figma node 1702:6142 — ~194x193pt)
const CARD_WIDTH = s(194);
const CARD_HEIGHT = vs(193);
const CARD_BORDER_RADIUS = ms(18);
const CARD_GAP = s(9);
const SKELETON_COUNT = 3;

// Header dimensions
const HEADER_HEIGHT = vs(32);
const ICON_SIZE = s(24);

/**
 * NftCarouselSectionSkeleton - Loading skeleton for NftCarouselSection
 *
 * Shows animated skeleton for:
 * - Section header with icon placeholder
 * - Single row of 3 NFT card placeholders
 */
export const NftCarouselSectionSkeleton: React.FC<NftCarouselSectionSkeletonProps> = ({
  style,
  testID,
}) => {
  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Header Skeleton */}
      <View style={styles.header}>
        {(() => {
          const headerWidth = Dimensions.get('window').width - s(18) * 2;
          const iconY = (HEADER_HEIGHT - ICON_SIZE) / 2;
          const titleX = ICON_SIZE + s(8);
          const titleW = s(80);
          const countX = titleX + titleW + s(8);
          const chevronSize = s(20);
          return (
            <ContentLoader
              speed={1.5}
              width={headerWidth}
              height={HEADER_HEIGHT}
              viewBox={`0 0 ${headerWidth} ${HEADER_HEIGHT}`}
              backgroundColor={colors.skeleton.base}
              foregroundColor={colors.skeleton.highlight}
            >
              {/* Icon circle */}
              <Rect
                x="0"
                y={iconY}
                rx={ICON_SIZE / 2}
                ry={ICON_SIZE / 2}
                width={ICON_SIZE}
                height={ICON_SIZE}
              />
              {/* Title */}
              <Rect
                x={titleX}
                y={(HEADER_HEIGHT - ms(18)) / 2}
                rx={ms(4)}
                ry={ms(4)}
                width={titleW}
                height={ms(18)}
              />
              {/* Count e.g. (5) */}
              <Rect
                x={countX}
                y={(HEADER_HEIGHT - ms(14)) / 2}
                rx={ms(4)}
                ry={ms(4)}
                width={s(28)}
                height={ms(14)}
              />
              {/* Chevron on the right */}
              <Rect
                x={headerWidth - chevronSize}
                y={(HEADER_HEIGHT - chevronSize) / 2}
                rx={ms(4)}
                ry={ms(4)}
                width={chevronSize}
                height={chevronSize}
              />
            </ContentLoader>
          );
        })()}
      </View>

      {/* Cards Skeleton — single horizontal row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={styles.scrollContent}
      >
        {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
          <View key={`skeleton-${index}`} style={styles.cardWrapper}>
            <ContentLoader
              speed={1.5}
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
              viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
              backgroundColor={colors.skeleton.base}
              foregroundColor={colors.skeleton.highlight}
            >
              <Rect
                x="0"
                y="0"
                rx={CARD_BORDER_RADIUS}
                ry={CARD_BORDER_RADIUS}
                width={CARD_WIDTH}
                height={CARD_HEIGHT}
              />
            </ContentLoader>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: vs(spacing['2xl']),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(spacing.headerPadding),
    marginBottom: vs(spacing.md),
    height: HEADER_HEIGHT,
  },
  scrollContent: {
    paddingHorizontal: s(spacing.headerPadding),
    gap: CARD_GAP,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: CARD_BORDER_RADIUS,
    overflow: 'hidden',
  },
});

export default NftCarouselSectionSkeleton;
