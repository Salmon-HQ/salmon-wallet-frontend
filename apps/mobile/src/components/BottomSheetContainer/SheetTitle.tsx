import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  fontFamilyNative,
  fontSize,
  letterSpacing,
  lineHeight,
  ms,
  spacing,
  type Semantic,
} from '@salmon/shared';
import { useThemedStyles } from '../../theme/useThemedStyles';

export interface SheetTitleProps {
  /** Optional element rendered before the title text, inline (e.g. a warning icon). */
  leading?: React.ReactNode;
  children: string;
}

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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    title: {
      fontSize: ms(fontSize.headline),
      fontFamily: fontFamilyNative.semiBold,
      color: t.text.primary,
      textAlign: 'center',
      letterSpacing: letterSpacing.snug,
      lineHeight: ms(fontSize.headline * lineHeight.condensed),
    },
  });

export default SheetTitle;
