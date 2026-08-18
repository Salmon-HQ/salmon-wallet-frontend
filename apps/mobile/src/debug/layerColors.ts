/**
 * TEMPORARY layer-color debug switch — top-chrome "double layer" investigation.
 *
 * Turn on: flip `DEBUG_LAYER_COLORS` to `true` below, reload the app.
 * Turn off: flip it back to `false` (the shipped/default value).
 *
 * Paints every candidate surface between the status bar and the balance
 * card a distinct, fully-opaque color, so a screenshot shows which surfaces
 * are actually stacked instead of guessing from the rendered shadows. Colors
 * only — no view is added or resized, so geometry is unaffected either way.
 *
 * Legend (see call sites for what each one is):
 * - magenta `#FF00FF` — GateContainer's `surface` (the whole collapsed gate
 *   card: avatar row + its rounded-bottom shadow).
 * - cyan `#00FFFF` — GateContainer's `headerBar` (the inner row that actually
 *   holds the avatar/copy/settings — its own separately rounded+shadowed rect).
 * - yellow `#FFFF00` — the `insets.top` spacer above `headerBar`, inside the
 *   same wrapper.
 * - orange `#FFA500` — the tabs layout's `topSafeAreaOverlay` (status-bar-area
 *   cover, rendered behind the gate).
 * - lime `#00FF00` — BalanceCardCarousel's outer container (the shadow-casting
 *   card wrapper, offset by `cardMarginTop`).
 * - red `#FF0000` — BalanceCardCarousel's gradient content area (normally the
 *   blockchain gradient).
 *
 * Delete this file once the top-chrome investigation is resolved — it must
 * never ship enabled.
 */
export const DEBUG_LAYER_COLORS = false;

export const DEBUG_LAYER_COLOR = {
  gateSurface: '#FF00FF',
  headerBar: '#00FFFF',
  headerTopSpacer: '#FFFF00',
  topSafeAreaOverlay: '#FFA500',
  balanceCardOuter: '#00FF00',
  balanceCardGradient: '#FF0000',
} as const;
