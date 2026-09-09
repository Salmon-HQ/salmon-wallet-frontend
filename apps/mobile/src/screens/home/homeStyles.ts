/**
 * The Home screen's styles, built once from the tokens. The route
 * (`app/(app)/(tabs)/index.tsx`) composes them; the helpers live under `src/`
 * because every file under `app/` is a navigable route.
 */

import { StyleSheet } from 'react-native';
import { componentSizes, s, spacing, vs, type Semantic } from '@salmon/shared';

/** Scroll distance over which the top fade gradient reaches full opacity. */
export const TOP_FADE_SCROLL_RANGE = 30;

export const stylesFor = (_t: Semantic) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    content: {
      flex: 1,
    },
    // The one gutter every Home sub-tab is held to. It lives on the content
    // containers here, not inside the tab components — a tab that drew its own
    // padding (or forgot to, as the NFTs grid did) is how the columns drifted.
    tabGutter: {
      paddingHorizontal: s(spacing.screenGutter),
    },
    // Block seams are the component gap (20), on both sub-tabs: header row →
    // balance block is this padding, balance block → sub-tabs row is
    // `pinnedSubTabs`' marginTop, sub-tabs row → content region is the bottom
    // padding. The anatomy inside each block keeps the finer 4/8/12 steps.
    pinnedHeader: {
      paddingHorizontal: s(spacing.screenGutter),
      paddingTop: vs(spacing.xl),
      paddingBottom: vs(spacing.xl),
    },
    pinnedSubTabs: {
      marginTop: vs(spacing.xl),
    },
    listContainer: {
      flex: 1,
    },
    chainContent: {
      flex: 1,
    },
    balanceErrorBanner: {
      marginHorizontal: s(spacing.screenGutter),
      marginBottom: vs(spacing.xl),
    },
    listContent: {
      paddingTop: 0,
      paddingBottom: vs(componentSizes.tabBarScrollPadding),
    },
    topFadeGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: componentSizes.sheetFadeGradientHeight,
      zIndex: 1,
    },
    // Bitcoin view styles
    bitcoinCard: {
      marginBottom: 0,
    },
    bitcoinScrollView: {
      flex: 1,
    },
    bitcoinContent: {
      paddingTop: 0,
      paddingBottom: vs(componentSizes.tabBarScrollPadding),
      // The component gap (DESIGN.md §Layout): chart, market data and About are
      // sibling components on this surface.
      gap: vs(spacing.screenGutter),
    },
  });

export type HomeStyles = ReturnType<typeof stylesFor>;
