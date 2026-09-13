/**
 * PlusMinusGlyph — the two-bar glyph the Powerup install/uninstall control
 * turns instead of swapping, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/PlusMinusGlyph`: two
 * identical bars, one fixed, one starting vertical (a plus). `minus` turns
 * the second bar a further 90° flat onto the fixed one, so the two overlap
 * exactly and read as a single minus. Mobile turns it with Reanimated; here
 * it is a CSS `transform` transition, which comes to the same reading on a
 * pair of stacked rectangles.
 */
import React from 'react';
import { motionEasing, motionMs, glyphTurnDeg } from '@salmon/shared';

import { useReducedMotion } from '../../motion';
import { useSemantic } from '../../theme/ThemeProvider';
import type { PlusMinusGlyphProps } from './types';

const DEFAULT_SIZE = 22;
/** Phosphor bold's own stroke-to-glyph ratio. */
const STROKE_RATIO = 1 / 11;

export function PlusMinusGlyph({ minus, size = DEFAULT_SIZE, color }: PlusMinusGlyphProps) {
  const t = useSemantic();
  const reducedMotion = useReducedMotion();
  const ink = color ?? t.text.primary;

  const box = size;
  const stroke = Math.max(2, Math.round(box * STROKE_RATIO));

  const bar: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: (box - stroke) / 2,
    width: box,
    height: stroke,
    borderRadius: 1,
    backgroundColor: ink,
  };

  return (
    <div data-testid="plus-minus-glyph" style={{ position: 'relative', width: box, height: box }}>
      <div data-testid="plus-minus-glyph-fixed-bar" style={bar} />
      <div
        data-testid="plus-minus-glyph-turning-bar"
        style={{
          ...bar,
          transform: `rotate(${minus ? glyphTurnDeg.minus : glyphTurnDeg.plus}deg)`,
          transition: reducedMotion
            ? undefined
            : `transform ${motionMs.drift}ms ${motionEasing.current.css}`,
        }}
      />
    </div>
  );
}

export default PlusMinusGlyph;
