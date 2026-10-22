import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  fontFamilyNative,
  fontSize,
  letterSpacing,
  lineHeight,
  ms,
  s,
  spacing,
  vs,
  type Semantic,
  type SheetTitlePropsBase,
} from '@salmon/shared';
import { useThemedStyles } from '../../theme/useThemedStyles';

export interface SheetTitleProps extends SheetTitlePropsBase {}

/**
 * SheetTitle — the one title style every sheet draws (24 semibold, centred),
 * with the optional subtitle under it in the screen header's subtitle voice.
 * Owns only the typography; the gap below it belongs to the sheet's content,
 * not to this component.
 */
export const SheetTitle: React.FC<SheetTitleProps> = ({ leading, children, subtitle }) => {
  const styles = useThemedStyles(stylesFor);
  const title = leading ? (
    <View style={styles.row}>
      {leading}
      <Text style={styles.title}>{children}</Text>
    </View>
  ) : (
    <Text style={styles.title}>{children}</Text>
  );
  if (!subtitle) return title;

  return (
    <View style={styles.header}>
      {title}
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    // The gutter keeps a long title off the sheet's edges when it wraps —
    // the DOM twin holds the same one.
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingHorizontal: s(spacing.screenGutter),
    },
    header: {
      gap: vs(spacing.xs),
    },
    title: {
      paddingHorizontal: s(spacing.screenGutter),
      fontSize: ms(fontSize.headline),
      fontFamily: fontFamilyNative.semiBold,
      color: t.text.primary,
      textAlign: 'center',
      letterSpacing: letterSpacing.snug,
      lineHeight: ms(fontSize.headline * lineHeight.condensed),
    },
    subtitle: {
      paddingHorizontal: s(spacing.screenGutter),
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.subtitle),
      lineHeight: s(fontSize.subtitle) * lineHeight.snug,
      color: t.text.secondary,
      textAlign: 'center',
    },
  });

export default SheetTitle;
