import { StyleSheet } from 'react-native';
import {
  fontFamilyNative,
  fontSize,
  lineHeight,
  s,
  spacing,
  vs,
  type Semantic,
} from '@salmon/shared';

export const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    /**
     * The inside of one step. 12 binds a label to its field and a field to its
     * hint; the 20 between steps' blocks is the layout's own (DESIGN.md
     * §Layout, the component gap).
     */
    stack: {
      gap: s(spacing.md),
    },
    scanState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: vs(spacing['3xl']),
      gap: s(spacing.md),
    },
    scanStateText: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.bodyLg),
    },
    bodyText: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.snug,
    },
    /** Matches PasswordInput's own error text, so hint and error share a slot. */
    hintText: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.caption),
      paddingHorizontal: s(spacing.xs),
    },
    errorText: {
      color: t.status.danger,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.caption),
      paddingHorizontal: s(spacing.xs),
    },
    addressText: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.mono,
      fontSize: s(fontSize.mono),
    },
  });
