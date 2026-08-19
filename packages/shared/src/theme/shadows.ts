/**
 * Shadow definitions for Salmon Wallet
 * Provides both React Native and CSS shadow formats
 */

/**
 * React Native shadow properties
 */
export const shadows = {
  /**
   * Shadow Vocabulary — the gate's collapsed header bar. The gate is a
   * sheet-like surface hanging from the top of the screen, and this is the
   * ambient its bottom edge casts on the content scrolling beneath it — the
   * downward counterpart of `sheet`. Registered into the vocabulary as-is
   * (values unchanged): the edge needs the shadow to read as an edge.
   */
  header: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 12,
  },
  /** Balance card shadow */
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 16,
  },
  /** Logo icon shadow */
  logo: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  /** Balance text shadow */
  balanceText: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 8,
  },
  /** Floating button / CTA glow — matches shadowsCSS.button */
  button: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.64,
    shadowRadius: 12,
    elevation: 8,
  },
  /** Subtle shadow for inputs and small elevated elements */
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  /** Medium shadow for NFT cards and image thumbnails */
  nftCard: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 9,
    elevation: 6,
  },
  /** Hero image heavy drop shadow — matches shadowsCSS.header */
  imageHero: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 16,
  },
  /**
   * Shadow Vocabulary — the gate/top-sheet surface when expanded. Same
   * rationale as `header`: the gate is a sheet-like surface whose bottom
   * edge needs an ambient to separate it from what it covers. Registered
   * into the vocabulary as-is (values unchanged).
   */
  topSheet: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  /** Bottom sheet upward shadow */
  sheet: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 20,
  },
} as const;

/**
 * CSS box-shadow values for web
 */
export const shadowsCSS = {
  none: 'none',
  /** Subtle shadow for cards */
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.18)',
  /** Default shadow */
  md: '0 2px 4px -1px rgba(0, 0, 0, 0.23), 0 4px 5px 0 rgba(0, 0, 0, 0.14)',
  /** Elevated shadow for modals, dropdowns */
  lg: '0 4px 8px -2px rgba(0, 0, 0, 0.3), 0 8px 16px -4px rgba(0, 0, 0, 0.2)',
  /** Header/card elements (Figma: 0px 10px 20px rgba(0,0,0,0.9)) */
  header: '0 10px 20px rgba(0, 0, 0, 0.9)',
  /** Balance card shadow */
  card: '0 12px 16px rgba(0, 0, 0, 0.8)',
  /**
   * Elevation E2 — the ambient a raised card casts on the plane below it.
   * A real offset and a real blur, rather than a bigger version of `card`:
   * depth here is material and edge, and the ambient only says "this object
   * is off the ground".
   */
  cardAmbient: '0 8px 24px -8px rgba(3, 6, 12, 0.45)',
  /** The lit rim. Every membrane and every raised card gets it. */
  rimHighlight: 'inset 0 1px 0 rgba(226, 236, 255, 0.14)',
  /** The underside, opposite the rim. */
  rimShade: 'inset 0 -1px 0 rgba(3, 6, 12, 0.50)',
  /**
   * Both rims at once — the bezel an object gets so it reads as a body with a
   * top and an underside rather than a flat rectangle.
   *
   * It is deliberately 1px each: what a filled control is missing is an *edge*,
   * not an interior. A heavier inset reads as *pressed*, and a primary button
   * that looks pressed at rest spends the affordance it needs and leaves the
   * real press (scale + specular) with nothing left to say.
   *
   * Usable verbatim on both platforms: React Native (0.83) parses this CSS
   * string in `processBoxShadow` and clips it to the view's own radius, so the
   * rim follows a pill end the way the DOM's does. One caveat, measured in the
   * RN source rather than assumed: Android draws inset shadows only from API 29
   * (`MIN_INSET_BOX_SHADOW_SDK_VERSION`); below that the bezel is absent and
   * nothing else changes.
   */
  bezel:
    'inset 0 1px 0 rgba(226, 236, 255, 0.14), inset 0 -1px 0 rgba(3, 6, 12, 0.50)',
  /** Button / floating CTA shadow */
  button: '0 0 12px rgba(0, 0, 0, 0.64)',
} as const;

export type Shadows = typeof shadows;
export type ShadowsCSS = typeof shadowsCSS;
