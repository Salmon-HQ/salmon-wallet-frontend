/**
 * BrandMark — the salmon mark, drawn.
 *
 * The mark used to be `Logo.png`, a 197x183 raster with a near-white `#FCFCFC`
 * baked into it, letterboxed inside square boxes of 48, 60, 80, 120 and 137.
 * At 120 on a 3x phone that is 360 device pixels asked of 197, which is the
 * softness visible on a real device — and the white was never a design
 * decision, it was the raster.
 *
 * This draws `markPaths` instead, so the mark is crisp at any size and takes
 * its colour from a token like any other ink — `text.primary` of the mode, which
 * is white at 16.89:1 on `surface.bedrock`. Geometry is the authored master
 * at 253x236: the slot drives the width and the height follows
 * `markAspectRatio`, so it is never squashed into a square.
 */
import { markAspectRatio, markPaths, markViewBoxAttr } from '@salmon/shared';

import { useSemantic } from '../../theme/useThemedStyles';
import Svg, { Path } from 'react-native-svg';
import type { BrandMarkProps } from './types';

export type { BrandMarkProps };

export function BrandMark({ size, color, testID }: BrandMarkProps) {
  // The default ink is the mode's, resolved at render: a default parameter
  // would freeze the dark palette's white at import.
  const { text } = useSemantic();
  const ink = color ?? text.primary;
  return (
    <Svg
      testID={testID ?? 'brand-mark'}
      width={size}
      height={size / markAspectRatio}
      viewBox={markViewBoxAttr}
      accessibilityRole="image"
    >
      {markPaths.map((d) => (
        <Path key={d.slice(0, 24)} d={d} fill={ink} />
      ))}
    </Svg>
  );
}
