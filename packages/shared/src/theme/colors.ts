/**
 * Color tokens for Salmon Wallet
 * Works for both React Native (Expo) and Web (WXT+Vite extension)
 */

import type { BlockchainId } from '../types/ui/balance-card';
import { danger, neutral, salmon, success } from './palette';
import { scales, surface } from './semantic';

export const colors = {
  background: {
    primary: '#10131c',
    secondary: '#161c2d',
    tertiary: 'rgba(255, 255, 255, 0.08)', // elevated surfaces
    card: 'rgba(255, 255, 255, 0.05)',
    glass: 'rgba(0, 0, 0, 0.4)',
    /**
     * List rows and the cards that behave like them.
     *
     * Opaque, and it has to be. This was `rgba(56, 63, 82, 0.10)` — a 10%
     * wash that let the ground read straight through an amount. DESIGN.md is
     * explicit that content is opaque by default and that translucency is a
     * privilege of floating chrome (plane P2 is "Opaque — the default"; only
     * P3 membranes are translucent), and a token row is content. The
     * consequence was not cosmetic: the water column's motif had to be
     * cropped to a band above the list, because a full-height field would
     * otherwise have been legible behind a balance.
     *
     * `surface.raised` rather than `surface.shelf` because the ground is a
     * ramp now, and `shelf` *is* the ramp's top stop (`neutral-950`) — a row
     * painted in it would vanish into the ground at the top of the column and
     * only appear further down. `raised` clears every stop of the ramp.
     */
    tokenItem: surface.raised,
  },
  text: {
    // Deep water has no pure white in it — `neutral-50` is the whitest thing
    // in the app. The retired values here (#FFFFFF, #8A8D98, #6B6E7B at
    // 3.66:1) are named in DESIGN.md as values not to reintroduce.
    primary: neutral[50],
    secondary: neutral[300],
    tertiary: neutral[400], // also used as placeholder color
    muted: 'rgba(255, 255, 255, 0.7)',
    balance: neutral[100], // subdued white for amounts and token names
    disabled: 'rgba(255, 255, 255, 0.4)',
  },
  border: {
    // #404962 measured 2.07:1 and is retired; `neutral-600` is 3.08:1.
    default: neutral[600],
    light: 'rgba(255, 255, 255, 0.8)',
    subtle: 'rgba(255, 255, 255, 0.15)',
  },
  accent: {
    primary: '#FF5C45',
    border: 'rgba(255, 92, 69, 0.8)',
    tint: 'rgba(255, 92, 69, 0.1)',
    tintHover: 'rgba(255, 92, 69, 0.15)',
  },
  /**
   * Price change indicators (keyed by LabelType).
   * The lime `#80ff54` is retired — the most generic "crypto app" value in the
   * old palette. Status ramps are hue-separated from salmon on purpose.
   */
  change: {
    positive: success[500],
    negative: danger[500],
    neutral: neutral[400],
  },
  input: {
    background: 'rgba(64, 73, 98, 0.2)',
    border: neutral[600],
  },
  button: {
    /** Salmon fill; the only legal ink on it is `primaryText` at 6.50:1. */
    primaryBackground: salmon[500],
    primaryText: neutral[1000],
    secondaryBackground: '#2a3441',
    secondaryText: '#FFFFFF',
    cancelBackground: '#1f232f',
    dangerHover: '#FF7A64',
    destructiveHover: '#DC2626',
    disabledText: '#666666',
    disabledOpacity: 0.5,
    inactiveBackground: '#444444',
  },
  step: {
    active: '#FF5C45',
    inactive: 'rgba(255, 255, 255, 0.3)',
  },
  /** TabBar navigation */
  tabBar: {
    active: '#FF5C45',
    inactive: 'rgba(255, 255, 255, 0.6)',
  },
  interactive: {
    surface: 'rgba(255, 255, 255, 0.04)',
    hoverSubtle: 'rgba(255, 255, 255, 0.06)',
    hoverStrong: 'rgba(255, 255, 255, 0.12)',
    hoverMedium: 'rgba(255, 255, 255, 0.15)',
    highlight: 'rgba(255, 255, 255, 0.2)',
  },
  overlay: {
    dark: 'rgba(15, 15, 15, 0.95)',
    darkHover: 'rgba(15, 15, 15, 0.9)',
  },
  skeleton: {
    base: 'rgba(64, 73, 98, 0.3)',
    highlight: 'rgba(64, 73, 98, 0.5)',
  },
  dialog: {
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  card: {
    background: 'rgba(64, 73, 98, 0.3)',
    border: 'rgba(255, 255, 255, 0.1)',
    borderActive: '#FF5C45',
  },
  sheet: {
    backdrop: '#000000',
    handle: '#b9b9b9',
  },
  /** QR Scanner — isolated color sub-system */
  scanner: {
    background: '#1a1a2e',
    surface: '#2a2a4e',
    text: '#ffffff',
    textSecondary: '#8b8b9e',
    textTertiary: '#6b6b7e',
    button: '#4a4a6e',
  },
  /** Decorative palette for badges, avatars, tags */
  palette: {
    orange: '#FF5C45',
    green: '#10B981',
    purple: '#8B5CF6',
    amber: '#F59E0B',
    blue: '#3B82F6',
    pink: '#EC4899',
    cyan: '#06B6D4',
    indigo: '#6366F1',
  },
} as const;

/**
 * Gradient definitions
 * - `colors` + `start`/`end` → React Native LinearGradient
 * - CSS strings → web linear-gradient()
 */
/**
 * The balance card is water, not a chain logo.
 *
 * Every `balanceCard*` key below used to carry a per-chain brand hue — a
 * cosmic purple for Solana, Bitcoin orange, Ethereum periwinkle — which made
 * the hero element of the home screen someone else's brand. In "Deep Water"
 * the only thing that varies between cards is **depth**: a mainnet card is a
 * deep pane of the column, a testnet card sits nearer the surface. Chain
 * identity is carried by the card's own logo, its name, and its network badge
 * — channels that survive a colorblind user, a narrow column, and a
 * screenshot, which a background hue does not.
 *
 * The keys are preserved because three apps read them.
 */
const DEEP_PANE = [neutral[850], neutral[900], neutral[950]] as const;
const SHALLOW_PANE = [neutral[800], neutral[850], neutral[900]] as const;
const VERTICAL = { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } } as const;
const DEEP_PANE_CSS = `linear-gradient(180deg, ${neutral[850]} 0%, ${neutral[900]} 50%, ${neutral[950]} 100%)`;
const SHALLOW_PANE_CSS = `linear-gradient(180deg, ${neutral[800]} 0%, ${neutral[850]} 50%, ${neutral[900]} 100%)`;

export const gradients = {
  /**
   * The primary fill. Flat `salmon-500`, not a gradient into a muddy red:
   * the ink on a salmon fill is `neutral-1000` at 6.50:1, and that ratio only
   * holds if the fill does not darken under the label.
   */
  primary: {
    colors: [salmon[500], salmon[500]] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  /** Primary action button */
  primaryButton: {
    colors: [salmon[500], salmon[500]] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0.04 },
  },
  /** Balance card default (diagonal descent through the column) */
  balanceCard: {
    colors: DEEP_PANE,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  /** Balance card Solana (vertical) */
  balanceCardSolana: {
    colors: DEEP_PANE,
    ...VERTICAL,
  },
  balanceCardSolanaDevnet: {
    colors: SHALLOW_PANE,
    ...VERTICAL,
  },
  balanceCardBitcoin: {
    colors: DEEP_PANE,
    ...VERTICAL,
  },
  balanceCardBitcoinTestnet: {
    colors: SHALLOW_PANE,
    ...VERTICAL,
  },
  balanceCardEthereum: {
    colors: DEEP_PANE,
    ...VERTICAL,
  },
  balanceCardEthereumSepolia: {
    colors: SHALLOW_PANE,
    ...VERTICAL,
  },
  /** Disabled state gradient — `surface.crest`. The salmon never dims. */
  disabled: {
    colors: [neutral[925], neutral[925]] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  /** Onboarding/Auth screens (primary → secondary vertical) */
  onboarding: {
    colors: ['#10131c', '#161c2d'] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  /**
   * TabBar bottom fade (water → transparent, bottom to top). The opaque stop
   * is the depth ramp's own floor (`semantic.water.gradient[1]`), so content
   * dissolves into the water darkening — never a flat black slab over it.
   */
  tabBarFade: {
    colors: [neutral[1000], 'rgba(7, 9, 17, 0)'] as const,
    start: { x: 0.5, y: 1 },
    end: { x: 0.5, y: 0 },
  },
  // CSS versions for web
  primaryCSS: `linear-gradient(180deg, ${salmon[500]} 0%, ${salmon[500]} 100%)`,
  primaryButtonCSS: `linear-gradient(180deg, ${salmon[500]} 0%, ${salmon[500]} 100%)`,
  disabledCSS: `linear-gradient(180deg, ${neutral[925]} 0%, ${neutral[925]} 100%)`,
  balanceCardSolanaCSS: DEEP_PANE_CSS,
  balanceCardSolanaDevnetCSS: SHALLOW_PANE_CSS,
  balanceCardBitcoinCSS: DEEP_PANE_CSS,
  balanceCardBitcoinTestnetCSS: SHALLOW_PANE_CSS,
  balanceCardEthereumCSS: DEEP_PANE_CSS,
  balanceCardEthereumSepoliaCSS: SHALLOW_PANE_CSS,
} as const;

export type Colors = typeof colors;
export type Gradients = typeof gradients;

/**
 * The scales stroke. One value, for every chain.
 *
 * Chain tinting is removed: a 6%-opacity pattern cannot be a data channel —
 * it survives neither a colorblind user nor a screenshot, and it was the last
 * place a chain's brand hue leaked into the water. The signature is kept
 * because three apps call it; only what it returns changed.
 */
export const getScalesColorForBlockchain = (_blockchain: BlockchainId): string =>
  scales.deepFieldStroke;

/**
 * Whether a colour hides whatever is behind it.
 *
 * Both `BlurContainer`s ask this before spending a blur. A backdrop blur
 * behind an opaque fill is a compositor layer that composites nothing, and
 * DESIGN.md's degradation ladder bans it outright on a list row in the
 * extension ("never on a scrolling container, never on a sheet, never on a
 * list row"). Now that rows are opaque, that ban is free to honour.
 *
 * Only the two shapes the token layer actually produces are recognised —
 * `#rgb`/`#rrggbb` hex and `rgb()`/`rgba()` — and anything unrecognised is
 * treated as translucent, so an unknown value keeps today's behaviour rather
 * than silently losing its blur.
 */
export const isOpaqueColor = (color: string): boolean => {
  const value = color.trim();
  if (value.startsWith('#')) return value.length === 4 || value.length === 7;
  const alpha = /^rgba?\([^)]*?(?:,|\/)\s*([\d.]+)\s*\)$/.exec(value);
  if (alpha) return Number(alpha[1]) >= 1;
  return /^rgb\(/.test(value);
};
