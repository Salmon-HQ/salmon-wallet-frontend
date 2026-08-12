/**
 * GradientBackground - Linear gradient container component
 *
 * Web version using CSS linear-gradient() for browser extension
 */
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import { gradients } from '@salmon/shared';
import type { GradientBackgroundProps } from './types';

/**
 * Convert React Native gradient coordinates to CSS gradient direction
 * RN uses {x: 0-1, y: 0-1} coordinates, CSS uses angles or keywords
 */
function coordsToGradientDirection(
  start: { x: number; y: number },
  end: { x: number; y: number }
): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Calculate angle in degrees (0deg = top, 90deg = right, etc.)
  // RN: {x:0,y:0} to {x:1,y:0} = horizontal right = 90deg
  // RN: {x:0,y:0} to {x:0,y:1} = vertical down = 180deg
  // RN: {x:0,y:0} to {x:1,y:1} = diagonal = 135deg
  const angleRad = Math.atan2(dx, -dy);
  const angleDeg = (angleRad * 180) / Math.PI;

  return `${angleDeg}deg`;
}

/**
 * Create CSS linear-gradient string from colors and direction
 */
function createGradient(
  colors: readonly string[],
  start: { x: number; y: number },
  end: { x: number; y: number }
): string {
  const direction = coordsToGradientDirection(start, end);
  const colorStops = colors.join(', ');
  return `linear-gradient(${direction}, ${colorStops})`;
}

const GradientContainer = styled(Box)<{ $gradientBg: string }>(({ $gradientBg }) => ({
  background: $gradientBg,
  width: '100%',
  height: '100%',
}));

/**
 * GradientBackground component for displaying linear gradients
 *
 * Converts React Native LinearGradient API to CSS gradients.
 * Supports custom colors and direction via start/end coordinates.
 *
 * @example
 * ```tsx
 * // Default primary gradient
 * <GradientBackground>
 *   <div>Content here</div>
 * </GradientBackground>
 *
 * // Custom gradient
 * <GradientBackground
 *   colors={['#FF5C45', '#A12A2A']}
 *   start={{ x: 0, y: 0 }}
 *   end={{ x: 1, y: 1 }}
 * >
 *   <div>Content here</div>
 * </GradientBackground>
 * ```
 */
export function GradientBackground({
  colors = gradients.primary.colors,
  start = gradients.primary.start,
  end = gradients.primary.end,
  style,
  children,
  className,
}: GradientBackgroundProps) {
  const gradientBg = createGradient(colors, start, end);

  return (
    <GradientContainer $gradientBg={gradientBg} style={style} className={className}>
      {children}
    </GradientContainer>
  );
}
