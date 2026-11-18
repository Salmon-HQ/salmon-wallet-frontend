import {
  borderRadius,
  fontFamilyNative,
  fontSize,
  s,
  spacing,
  vs,
  type Semantic,
} from '@salmon/shared';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

// A type alias, not an interface: `StyleSheet.create` takes an indexable shape.
type SheetBodyStyles = {
  bedrock: ViewStyle;
  scroll: ViewStyle;
  content: ViewStyle;
  message: TextStyle;
  actions: ViewStyle;
};

/**
 * The body a confirming sheet shares with every other one: the bedrock behind
 * it, a scroll that hugs its content until the container's ceiling, the
 * message and the stack of actions. A sheet spreads this into its own
 * `StyleSheet.create` and adds what only it draws.
 */
export const sheetBodyStyles = (t: Semantic): SheetBodyStyles => ({
  bedrock: {
    ...StyleSheet.absoluteFill,
    backgroundColor: t.surface.bedrock,
    borderTopLeftRadius: borderRadius.header,
    borderTopRightRadius: borderRadius.header,
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: s(spacing.screenGutter),
    paddingTop: vs(spacing.md),
    gap: vs(spacing.xl),
  },
  message: {
    color: t.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: s(fontSize.bodyLg),
    // Left-aligned: the message runs to several lines, and a centred block
    // moves the start of every line.
    textAlign: 'left',
  },
  actions: {
    gap: vs(spacing.sm),
  },
});
