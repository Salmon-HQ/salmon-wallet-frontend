/**
 * Responsive scaling utilities - Web fallback
 *
 * On web, uses window dimensions when available, otherwise falls back
 * to design dimensions (identity scaling). Native version uses
 * react-native Dimensions (see scaling.native.ts).
 *
 * Dimensions are resolved lazily on first use to handle contexts
 * where the viewport isn't sized yet at module-load time (e.g.
 * Chrome extension side panels).
 */

export const DESIGN_WIDTH = 440;
export const DESIGN_HEIGHT = 956;

// Cap dimensions at design size so scaling never exceeds 1.0x on web.
// Without this cap, a 1440px browser window produces a 3.27x scale factor,
// making all UI elements enormous. Extension popups (~360px) stay below the
// cap and scale down as intended (~0.82x).
const MAX_SCALING_WIDTH = DESIGN_WIDTH;
const MAX_SCALING_HEIGHT = DESIGN_HEIGHT;

let _width: number | null = null;
let _height: number | null = null;

const getDimensions = (): { width: number; height: number } => {
  if (_width !== null && _height !== null) {
    return { width: _width, height: _height };
  }
  if (typeof window !== 'undefined' && window.innerWidth > 0 && window.innerHeight > 0) {
    _width = Math.min(window.innerWidth, MAX_SCALING_WIDTH);
    _height = Math.min(window.innerHeight, MAX_SCALING_HEIGHT);
    return { width: _width, height: _height };
  }
  // Not yet available — return design dims (identity scaling) without caching
  // so we re-check on the next call.
  return { width: DESIGN_WIDTH, height: DESIGN_HEIGHT };
};

export const scale = (size: number): number => (getDimensions().width / DESIGN_WIDTH) * size;
export const s = scale;

export const verticalScale = (size: number): number =>
  (getDimensions().height / DESIGN_HEIGHT) * size;
export const vs = verticalScale;

export const moderateScale = (size: number, factor = 0.5): number =>
  size + (scale(size) - size) * factor;
export const ms = moderateScale;

export const moderateVerticalScale = (size: number, factor = 0.5): number =>
  size + (verticalScale(size) - size) * factor;
export const mvs = moderateVerticalScale;
