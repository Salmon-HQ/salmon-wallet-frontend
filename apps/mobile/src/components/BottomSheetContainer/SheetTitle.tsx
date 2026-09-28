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
  type Semantic,
  type SheetTitlePropsBase,
} from '@salmon/shared';
import { useThemedStyles } from '../../theme/useThemedStyles';

export interface SheetTitleProps extends SheetTitlePropsBase {}

/**
 * SheetTitle — the one hand-drawn title style every sheet used to redraw
 * itself (24 semibold, centred). Owns only the typography; the gap below it
 * belongs to the sheet's content, not to this component.
 */
export const SheetTitle: React.FC<SheetTitleProps> = ({ leading, children }) => {
  const styles = useThemedStyles(stylesFor);
  if (!leading) {
    return <Text style={styles.title}>{children}</Text>;
  }

  return (
    <View style={styles.row}>
      {leading}
      <Text style={styles.title}>{children}</Text>
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
    title: {
      paddingHorizontal: s(spacing.screenGutter),
      fontSize: ms(fontSize.headline),
      fontFamily: fontFamilyNative.semiBold,
      color: t.text.primary,
      textAlign: 'center',
      letterSpacing: letterSpacing.snug,
      lineHeight: ms(fontSize.headline * lineHeight.condensed),
    },
  });

export default SheetTitle;
