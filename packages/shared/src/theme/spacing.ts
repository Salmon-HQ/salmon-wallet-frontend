/**
 * Spacing scale for Salmon Wallet
 * Based on 4px base unit for consistent spacing
 * Works for both React Native (Expo) and Web (WXT+Vite extension)
 */

export const spacing = {
  /** 0px */
  none: 0,
  /** 2px */
  xxs: 2,
  /** 4px */
  xs: 4,
  /** 8px */
  sm: 8,
  /** 10px */
  base: 10,
  /** 12px */
  md: 12,
  /** 16px */
  lg: 16,
  /** 18px - Header horizontal padding */
  headerPadding: 18,
  /** 20px */
  xl: 20,
  /** 22px - Lock screen gap */
  lockScreenGap: 22,
  /** 24px */
  '2xl': 24,
  /** 30px */
  '3.5xl': 30,
  /** 31px - Lock screen section gap */
  lockScreenSectionGap: 31,
  /** 32px */
  '3xl': 32,
  /** 34px - Sheet bottom padding */
  sheetBottomPadding: 34,
  /** 36px - Lock screen horizontal padding */
  lockScreenPadding: 36,
  /** 40px */
  '4xl': 40,
  /** 42px - Pagination gap in balance card */
  paginationGap: 42,
  /** 45px - Tab bar outer padding */
  tabBarPadding: 45,
  /** 48px */
  '5xl': 48,
  /** 60px */
  '5.5xl': 60,
  /** 80px */
  '7xl': 80,
} as const;

/**
 * The radius scale — seven steps plus `full` (DESIGN.md §Shapes).
 *
 * Kept as a named const so the legacy aliases below can reference the steps
 * instead of repeating the numbers.
 */
const radiusScale = {
  /** 0px */
  r0: 0,
  /** 4px - chips, tags */
  r1: 4,
  /** 8px - icons */
  r2: 8,
  /**
   * 12px — the control radius.
   *
   * Every interactive control in the system sits here: buttons, text inputs,
   * action buttons, list rows, small cards. A control is not a pill.
   */
  r3: 12,
  /** 16px - cards */
  r4: 16,
  /** 22px - the inner core of a bezel */
  r5: 22,
  /** 28px - bezel outer, sheets, the balance card (consolidated from 26) */
  r6: 28,
  /** 9999px - fully rounded: avatars, toggles */
  full: 9999,
} as const;

/**
 * Border radius tokens.
 *
 * `r0`–`r6` + `full` are the scale; everything else is a legacy alias
 * (soft-deprecated — prefer the `rN` step named in each tag) or an off-scale
 * one-off the scale does not yet consolidate.
 */
export const borderRadius = {
  ...radiusScale,
  /** 0px @deprecated use `r0` */
  none: radiusScale.r0,
  /** 2px - Scrollbar thumb (off-scale one-off) */
  scrollbar: 2,
  /** 4px @deprecated use `r1` */
  sm: radiusScale.r1,
  /** 8px @deprecated use `r2` */
  md: radiusScale.r2,
  /** 9px - NFT card badges (off-scale one-off) */
  badge: 9,
  /** 12px — the control radius. @deprecated use `r3` */
  lg: radiusScale.r3,
  /**
   * 12px — alias of `r3`, kept because ~15 call sites across three apps import
   * it by this name. It used to be 14; it was never a distinct step, only the
   * legacy scale's separate value for "button". Pinned by
   * `controlRadius.test.ts`.
   */
  button: radiusScale.r3,
  /** 16px @deprecated use `r4` */
  xl: radiusScale.r4,
  /** 18px - Icon containers (off-scale one-off) */
  iconContainer: 18,
  /** 20px - Large icon/avatar corners (off-scale one-off) */
  iconLg: 20,
  /** 22px - Token icon corners @deprecated use `r5` */
  tokenIcon: radiusScale.r5,
  /** 24px - Header corners (off-scale one-off) */
  header: 24,
  /** 24px (off-scale one-off) */
  '2xl': 24,
  /** 28px - Balance card / sheet corners @deprecated use `r6` (was 26) */
  card: radiusScale.r6,
} as const;

/**
 * Component sizes for consistent UI elements
 */
export const componentSizes = {
  // Buttons
  buttonHeight: 56,
  buttonHeightMedium: 48,
  buttonHeightSmall: 44,
  /** 42px - Compact action buttons (swap, bridge, receive, success) */
  buttonHeightCompact: 42,
  /**
   * The control radius. It was 28, which on a 56px control is a pill, and the
   * product owner does not want pills: a button must read with the same
   * roundness as a token list row and a text input. All three now resolve to
   * `borderRadius.lg` (12) — one number, so a call site cannot drift.
   */
  buttonRadius: borderRadius.lg,
  /**
   * Tile scale for the flesh texture inside a filled control.
   *
   * The drawing is authored on a 138×88 tile, which at 1:1 puts its bands
   * ~13.8px apart — four or five of them across a full-width pill, each one a
   * broad streak wider than a letter stroke.
   *
   * Shrinking to 0.55 lands the bands ~7.6px apart and reads as grain rather
   * than as streaks. It was tried and the product owner preferred the bands at
   * their authored size, so 1 is the shipped value. Contrast is not what
   * decides this: every band is paler than the fill, so the ink's worst case is
   * the flat fill's 6.50:1 either way (`flesh.test.ts`) — the choice is purely
   * how large the material reads.
   */
  buttonFleshScale: 1,

  // ActionButtonRow
  actionButtonWidth: 112,
  actionButtonHeight: 47,
  /** The control radius — see `buttonRadius`. Was 14. */
  actionButtonRadius: borderRadius.lg,
  actionButtonIcon: 16,

  // Inputs
  inputHeight: 56,
  /** 58px - Swap amount input */
  inputHeightLg: 58,
  /** The control radius — see `buttonRadius`. Already 12; now bound to it. */
  inputRadius: borderRadius.lg,
  /** 14px - Input vertical padding */
  inputPaddingVertical: 14,

  /**
   * 180px - the ceiling of the account's profile avatar, the one place an
   * avatar is a hero rather than an identity chip. It is a ceiling and not a
   * size: the surface it sits on is a resizable narrow column, so the avatar
   * tracks the column's width and stops growing here.
   */
  avatarProfileMax: 180,

  // Logo
  logoSizeLarge: 137,
  logoSizeMedium: 120,
  /** 96px - Success circle */
  successCircleSize: 96,
  logoSizeSmall: 80,

  // Step indicator
  stepDotSize: 8,
  stepDotGap: 8,

  // Checkbox
  checkboxSize: 24,

  // Icon scale
  /** 12px */
  iconSizeXxs: 12,
  /** 14px */
  iconSizeXxsm: 14,
  /** 16px */
  iconSizeXs: 16,
  /** 18px - Type badges, source badge chips */
  iconSizeXSmall: 18,
  /** 20px */
  iconSizeSmall: 20,
  /** 22px - Compact token icons (swap selector) */
  iconSizeCompact: 22,
  /** 24px */
  iconSizeMedium: 24,
  /** 28px - Small copy/action icon buttons */
  iconSizeMButton: 28,
  /** 32px */
  iconSizeLarge: 32,
  /** 36px - Token card logos, address book rows */
  iconSizeXL: 36,
  /** 40px - Avatars, type icon containers */
  iconSize2XL: 40,
  /** 48px - Featured tokens, add account icons */
  iconSize3XL: 48,
  /** 52px - NFT action buttons height */
  iconSize4XL: 52,
  /** 54px - Swap logo container width */
  iconSize5XL: 54,
  /** 100px - Large token icons (confirmation step) */
  tokenIconXL: 100,

  // Header
  headerHeight: 56,
  /** 44px - Header action buttons */
  headerButtonSize: 44,
  backButtonSize: 40,
  /**
   * 38px - one compact row inside the grouped review-details card (owner's
   * band is 36-40; tune here and every review screen moves together). The
   * per-row pill it replaces sat at `backButtonSize` + 9px of gap each.
   */
  swapDetailRowHeight: 38,

  // Balance card elements
  logoContainer: 35,
  /**
   * @deprecated Larger than `logoContainer`, which is what it is drawn inside.
   * Size the mark from its container with `blockchainMarkRatio` instead — a
   * mark sized from its own token overflowed the box by eight points and
   * clipped Bitcoin's glyph, which fills its viewBox more than Solana's does.
   */
  blockchainIcon: 45,
  /**
   * The chain mark inside `logoContainer`. Under 1 by construction, so the
   * mark can never reach the edge of the box that centres it whatever either
   * value is retuned to. One rule, read by all three surfaces that draw it.
   */
  blockchainMarkRatio: 0.74,
  eyeIcon: 20,
  changeArrowIcon: 15,
  /** Inner header container height */
  headerInnerHeight: 63,

  // Tab Bar (GlassTabBar)
  /**
   * The tab bar's corner radius. Product-owner decision: the bar is a control,
   * not a pill — it sits on the control radius (was 28). Pinned by
   * `controlRadius.test.ts`.
   */
  tabBarRadius: borderRadius.lg,
  tabBarPaddingTop: 32,
  tabBarMinBottomPadding: 16,
  /** 60px - Tab bar item container height */
  tabBarItemHeight: 60,
  tabBarHeight: 88,
  /** Scroll content bottom padding to clear tab bar */
  tabBarScrollPadding: 160,

  // TokenListItem (from Figma)
  tokenIcon: 38,

  // Sheet/Modal components
  sheetHandleWidth: 70,
  sheetHandleHeight: 6,
  sheetHandleOpacity: 0.4 as const,
  /** Top fade gradient height */
  sheetFadeGradientHeight: 30,

  // ReceiveSheet
  qrBorderWidth: 22,
  receiveContentGap: 32,
  copyButtonWidth: 180,

  // Scrollbar widths
  /** 4px - Thin scrollbar */
  scrollbarWidthSm: 4,
  /** 6px - Standard scrollbar */
  scrollbarWidth: 6,

  // Dividers
  dividerHeight: 1,

  // Background decorative
  backgroundPatternHeight: 200,

  // NFT
  nftBadgeHeight: 25,
  nftCardGap: 9,
  /** 194px - NFT card width (mobile) */
  nftCardWidth: 194,
  /** 193px - NFT card height (mobile) */
  nftCardHeight: 193,

  // Skeleton
  skeletonBadgeWidth: 100,
  shimmerOffset: 200,
  shimmerWidth: 400,
  skeletonBalanceWidth: 70,

  // Button min-widths
  buttonMinWidth: 120,
  buttonMinWidthLg: 160,

  // The descent — the wait indicator that replaced the spinning ring. A track
  // and a segment of salmon *ink* that runs down it: it travels downward, which
  // is the opposite direction to The Surfacing, so a wait and a success can
  // never be confused for each other; and being ink rather than a fill it does
  // not spend the one living salmon element a screen is allowed.
  /** 2px — the track is a hairline, not a bar. */
  descentTrackWidth: 2,
  /** 120px — one full pass, long enough for the deceleration to be legible. */
  descentTrackHeight: 120,
  /** 44px — the moving segment; a bit over a third of the track. */
  descentSegmentHeight: 44,
  /** 3px — wave displacement. Perceptible if you look, invisible if you don't. */
  waveAmplitude: 3,

  // Swap
  swapSelectorMinWidth: 100,
  swapReviewCardMinHeight: 75,

  // Badge
  badgeMinWidth: 55,

  // Token icon small (web)
  tokenIconSm: 33,

  // Chart
  chartHeight: 200,

  // Web layout
  webContainerMaxWidth: 430,

  // NFT
  nftImageMaxWidth: 406,

  // QR
  qrCodeSize: 220,

  // Drawer / Panel
  drawerWidth: 320,

  // Dialog / Sheet widths
  dialogWidthSm: 340,
  /**
   * Minimum height for a full-screen-style stage (e.g. the transaction
   * success receipt) when it plays inside a dialog instead of a page.
   */
  dialogStageMinHeight: 420,
  sheetWidthSm: 360,
  sheetWidthMd: 380,
  sheetWidthBase: 400,
  sheetWidthLg: 420,
  sheetWidthXl: 440,

  // Sheet
  sheetMaxHeight: 700,

  // Lock Screen (mobile)
  /** 140px - Lock screen logo */
  lockScreenLogoSize: 140,
  /** 72px - Lock screen logo (extension) */
  lockScreenLogoSizeExtension: 72,
  /** 64px - Biometric auth button */
  biometricButtonSize: 64,

  // Breakpoints
  breakpointDesktop: 768,
} as const;

/**
 * Content padding values for screens and containers
 */
export const contentPadding = {
  screen: 24,
} as const;

/**
 * Border width tokens
 */
export const borderWidth = {
  /** 0.5px - Action button border */
  actionButton: 0.5,
  /** 0.75px - TokenListItem / sheet top border */
  tokenListItem: 0.75,
  /** 0.75px - Sheet top border */
  sheet: 0.75,
  /** 0.8px - Accent/decorative borders */
  accent: 0.8,
  /** 1px */
  thin: 1,
  /** 1.5px */
  thick: 1.5,
  /** 2px */
  medium: 2,
  /** 3px - Loading spinner */
  heavy: 3,
} as const;

/**
 * Opacity tokens for consistent transparency values
 */
export const opacity = {
  /** 0.4 - Placeholder / very muted */
  faint: 0.4,
  /** 0.5 - Disabled / inactive */
  disabled: 0.5,
  /** 0.6 - Low emphasis text */
  low: 0.6,
  /** 0.8 - Medium emphasis / active press */
  medium: 0.8,
  /** 0.85 - Hover / secondary content */
  high: 0.85,
  /** 0.9 - Subtle mute / soft emphasis */
  soft: 0.9,
  /** 1 - Fully opaque */
  full: 1,
} as const;

/**
 * Blur intensity tokens for backdrop filters and blur effects
 */
export const blur = {
  /** 2.5px - Extra subtle blur */
  xs: 2.5,
  /** 6px - Light blur (card badges) */
  sm: 6,
  /** 10px - Medium blur (sheet overlays) */
  md: 10,
  /** 12px - Strong blur (interactive elements) */
  lg: 12,
} as const;

export type Blur = typeof blur;
export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
export type ComponentSizes = typeof componentSizes;
export type ContentPadding = typeof contentPadding;
export type BorderWidth = typeof borderWidth;
export type Opacity = typeof opacity;
