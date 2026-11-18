import {
  componentSizes,
  fontFamilyNative,
  fontSize,
  ms,
  s,
  spacing,
  vs,
  type Semantic,
} from '@salmon/shared';
import type { TextStyle, ViewStyle } from 'react-native';

// A type alias, not an interface: `StyleSheet.create` takes an indexable shape.
type BlockingScreenStyles = {
  container: ViewStyle;
  title: TextStyle;
  body: TextStyle;
  action: ViewStyle;
};

/**
 * A screen that stands in for the whole app and offers one way forward — an
 * update is required, the wallet could not start: a title, a line of copy and
 * one button, centred on the abyss.
 */
export const blockingScreenStyles = (t: Semantic): BlockingScreenStyles => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(spacing['2xl']),
    backgroundColor: t.depth.abyss,
  },
  title: {
    fontFamily: fontFamilyNative.semiBold,
    fontSize: ms(fontSize.title),
    color: t.text.primary,
    textAlign: 'center',
    marginBottom: vs(spacing.md),
  },
  body: {
    fontFamily: fontFamilyNative.regular,
    fontSize: ms(fontSize.body),
    color: t.text.secondary,
    textAlign: 'center',
    marginBottom: vs(spacing['2xl']),
  },
  // Size only. Radius, fill, border, bezel and material belong to the button.
  action: {
    minHeight: vs(componentSizes.buttonHeightMedium),
    height: vs(componentSizes.buttonHeightMedium),
  },
});
