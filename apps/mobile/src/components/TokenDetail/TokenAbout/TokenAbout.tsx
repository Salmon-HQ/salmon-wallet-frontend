import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextLayoutEventData,
  NativeSyntheticEvent,
  useWindowDimensions,
} from 'react-native';
import {
  semantic,
  fontFamilyNative,
  fontSize,
  lineHeight,
  ms,
  vs,
  s,
  borderRadius,
  spacing,
} from '@salmon/shared';
import { BlurContainer } from '../../BlurContainer';
import { ShimmerRect } from '../../ShimmerRect';
import type { TokenAboutProps } from './types';

/**
 * TokenAbout component for displaying token description
 *
 * Features:
 * - Glassmorphism container
 * - "About" section header
 * - Expandable text with "Read more" / "Read less"
 * - Loading skeleton state
 *
 * @example
 * ```tsx
 * <TokenAbout
 *   description="Bitcoin is a decentralized digital currency..."
 *   maxLines={4}
 * />
 * ```
 */
export const TokenAbout: React.FC<TokenAboutProps> = ({
  description,
  title,
  loading = false,
  maxLines = 0, // 0 = no limit, container adapts to content
  style,
}) => {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('token.info.about', 'About');
  const [expanded, setExpanded] = useState(false);
  const [shouldShowReadMore, setShouldShowReadMore] = useState(false);
  const { width: windowWidth } = useWindowDimensions();

  const handleTextLayout = useCallback(
    (e: NativeSyntheticEvent<TextLayoutEventData>) => {
      if (maxLines > 0 && e.nativeEvent.lines.length > maxLines) {
        setShouldShowReadMore(true);
      }
    },
    [maxLines]
  );

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  if (loading) {
    // The card's own content width — the window minus the screen gutters and
    // the card's own padding — so the description lines read as text
    // filling the card rather than an arbitrary block.
    const lineWidth = windowWidth - 2 * s(spacing.screenGutter) - 2 * s(spacing.md);

    return (
      <BlurContainer style={[styles.glassWrapper, style]}>
        <View style={[styles.container, styles.skeletonLines]}>
          <ShimmerRect width={s(60)} height={vs(18)} />
          <ShimmerRect width={lineWidth} height={vs(12)} />
          <ShimmerRect width={lineWidth * 0.95} height={vs(12)} />
          <ShimmerRect width={lineWidth * 0.9} height={vs(12)} />
          <ShimmerRect width={lineWidth * 0.7} height={vs(12)} />
        </View>
      </BlurContainer>
    );
  }

  if (!description) {
    return null;
  }

  return (
    <BlurContainer style={[styles.glassWrapper, style]}>
      <View style={styles.container}>
        <Text style={styles.title}>{resolvedTitle}</Text>
        <Text
          style={styles.description}
          numberOfLines={expanded || maxLines === 0 ? undefined : maxLines}
          onTextLayout={handleTextLayout}
        >
          {description}
        </Text>
        {shouldShowReadMore && (
          <TouchableOpacity
            onPress={toggleExpanded}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={
              expanded
                ? t('token.about.readLess', 'Read less')
                : t('token.about.readMore', 'Read more')
            }
          >
            <Text style={styles.readMore}>
              {expanded
                ? t('token.about.readLess', 'Read less')
                : t('token.about.readMore', 'Read more')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </BlurContainer>
  );
};

const styles = StyleSheet.create({
  // No horizontal margin of its own: the card spans whatever column it is
  // placed in, and the surface owns its gutters (DESIGN.md §Layout). The 24
  // that used to live here inset the card inside the home Bitcoin column,
  // and every other consumer already had to cancel it with
  // `marginHorizontal: 0`.
  glassWrapper: {
    borderRadius: borderRadius.iconContainer,
    overflow: 'hidden',
  },
  container: {
    padding: s(spacing.md),
  },
  skeletonLines: {
    gap: vs(spacing.sm),
  },
  title: {
    fontSize: ms(fontSize.body),
    fontFamily: fontFamilyNative.semiBold,
    color: semantic.text.primary,
    marginBottom: vs(spacing.sm),
    letterSpacing: ms(-0.07, 0.3),
  },
  description: {
    fontSize: ms(fontSize.micro),
    fontFamily: fontFamilyNative.regular,
    color: semantic.text.primary,
    lineHeight: ms(fontSize.body) * lineHeight.normal,
    letterSpacing: ms(-0.045, 0.3),
  },
  readMore: {
    fontSize: ms(fontSize.caption),
    fontFamily: fontFamilyNative.medium,
    color: semantic.accent.ink,
    marginTop: vs(spacing.sm),
  },
});

export default TokenAbout;
