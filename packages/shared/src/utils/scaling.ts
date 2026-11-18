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

import { createScalers, DESIGN_HEIGHT, DESIGN_WIDTH } from './scalingCore';

export { DESIGN_HEIGHT, DESIGN_WIDTH };

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

export const { s, vs, ms, mvs } = createScalers(getDimensions);
