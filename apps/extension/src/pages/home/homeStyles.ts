/**
 * The Home shell's layout styles. Static objects, built once from the tokens
 * — the ground, the fixed block above the content, the scroller under it and
 * the two fades that seam them.
 */

import type React from 'react';
import { componentSizes, spacing } from '@salmon/shared';

/** Scroll distance over which the top seam fade reaches full opacity. */
export const TOP_FADE_SCROLL_RANGE = 30;

/**
 * The panel shell.
 *
 * The ground is mounted here, once, behind everything: the depth ramp, the
 * deep field's scales and the bottom fade that ends on the ramp's own floor
 * (mobile mounts the same three in `app/(app)/(tabs)/_layout.tsx`). The
 * screens are siblings of it, so the water never travels with them.
 */
export const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100dvh',
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: 'var(--sw-water-gradient-1)',
};

/**
 * The bottom fade. It starts and ends on the ramp's own floor —
 * `transparent` is black at alpha 0, which smudged the fade grey on its way to
 * nothing, and on the pale ground it painted a dark band.
 */
export const bottomFadeStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  // No `componentSizes` token fits this fade's height (mobile's shell uses the
  // same 180 in `(tabs)/_layout.tsx`).
  height: 180,
  background:
    'linear-gradient(to bottom, var(--sw-water-fadeBottom-0), var(--sw-water-fadeBottom-1))',
  pointerEvents: 'none',
  zIndex: 0,
};

/** Everything the user reads sits above the ground, in flow. */
export const screenStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};

/**
 * The block above the content region. It is fixed on both sub-tabs — nothing
 * above the sub-tab row scrolls, on either of them (DESIGN.md §Navigation).
 * Block seams are the component gap (20) on every side.
 */
export const pinnedHeaderStyle: React.CSSProperties = {
  paddingLeft: spacing.screenGutter,
  paddingRight: spacing.screenGutter,
  paddingTop: spacing.xl,
  paddingBottom: spacing.xl,
};

export const pinnedSubTabsStyle: React.CSSProperties = {
  marginTop: spacing.xl,
};

/**
 * The two elements the view transition names, so the browser can carry the
 * sub-tab row from one position to the other and cross-fade the balance
 * block out; `viewTransitionName` is not in React's CSS typings yet.
 */
export const balanceBlockStyle = { viewTransitionName: 'home-balance' } as React.CSSProperties;
export const subTabsStyle = {
  ...pinnedSubTabsStyle,
  viewTransitionName: 'home-sub-tabs',
} as React.CSSProperties;
/** Focus mode: the row stands where the chain selector stood, no seam above. */
export const risenSubTabsStyle = { ...subTabsStyle, marginTop: 0 } as React.CSSProperties;

/** The content region: the only part of Home that scrolls. */
export const contentRegionStyle: React.CSSProperties = {
  position: 'relative',
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};

/**
 * The one mask on this screen: the seam between the fixed row above and the
 * list scrolling under it. It starts on the ramp's own top stop and ends on
 * that same colour at alpha 0, so it clears without smudging on either ground.
 */
export const topSeamFadeStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: componentSizes.sheetFadeGradientHeight,
  background: 'linear-gradient(to bottom, var(--sw-water-fadeTop-0), var(--sw-water-fadeTop-1))',
  pointerEvents: 'none',
  zIndex: 1,
  opacity: 0,
};

/** The scroller Portfolio's list and the Bitcoin column live in. */
export const scrollColumnStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  paddingLeft: spacing.screenGutter,
  paddingRight: spacing.screenGutter,
  paddingBottom: spacing['2xl'],
};

/** A flex column that fills its parent — the shape every `SinkFloat` on Home takes. */
export const fillColumnStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};
