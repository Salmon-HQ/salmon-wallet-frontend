import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextLayoutEventData,
  NativeSyntheticEvent,
} from 'react-native';
import { ContentLoader, Rect } from '@salmon/shared';
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
    return (
      <BlurContainer style={[styles.glassWrapper, style]}>
        <View style={styles.container}>
          <ContentLoader
            speed={1.5}
            width="100%"
            height={100}
            backgroundColor={semantic.skeleton.base}
            foregroundColor={semantic.skeleton.highlight}
          >
            <Rect x="0" y="0" rx="4" ry="4" width="60" height="18" />
            <Rect x="0" y="28" rx="4" ry="4" width="100%" height="12" />
            <Rect x="0" y="46" rx="4" ry="4" width="95%" height="12" />
            <Rect x="0" y="64" rx="4" ry="4" width="90%" height="12" />
            <Rect x="0" y="82" rx="4" ry="4" width="70%" height="12" />
          </ContentLoader>
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
