/**
 * Responsive scaling utilities for Salmon Wallet
 * Based on iPhone 17 Pro Max dimensions (440 x 956 points)
 *
 * @example
 * ```tsx
 * import { s, vs, ms } from '@salmon/shared';
 *
 * const styles = StyleSheet.create({
 *   container: {
 *     paddingHorizontal: s(24),  // Scales horizontally
 *     height: vs(60),            // Scales vertically
 *     fontSize: ms(14),          // Moderate scale (less aggressive)
 *     fontSize: ms(14, 0.3),     // Custom factor (0.3 = 30% of scaling)
 *   }
 * });
 * ```
 */
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

/**
 * iPhone 17 Pro Max dimensions in logical points
 * This is our design reference device
 */
export const DESIGN_WIDTH = 440;
export const DESIGN_HEIGHT = 956;

/**
 * Horizontal scale - use for widths, horizontal paddings/margins, horizontal gaps
 * Scales linearly based on screen width ratio
 *
 * @param size - Size in points (designed for iPhone 17 Pro Max)
 * @returns Scaled size for current device
 */
const scale = (size: number): number => (width / DESIGN_WIDTH) * size;

/**
 * Shorthand alias for scale()
 */
export const s = scale;

/**
 * Vertical scale - use for heights, vertical paddings/margins, vertical gaps
 * Scales linearly based on screen height ratio
 *
 * @param size - Size in points (designed for iPhone 17 Pro Max)
 * @returns Scaled size for current device
 */
const verticalScale = (size: number): number => (height / DESIGN_HEIGHT) * size;

/**
 * Shorthand alias for verticalScale()
 */
export const vs = verticalScale;

/**
 * Moderate scale - use for font sizes and elements that shouldn't scale too aggressively
 * Applies a dampened scaling factor (default 0.5 = 50% of linear scaling)
 *
 * @param size - Size in points (designed for iPhone 17 Pro Max)
 * @param factor - Scaling factor (0-1), default 0.5. Lower = less scaling
 * @returns Scaled size for current device
 *
 * @example
 * // On a smaller device (375px width):
 * moderateScale(16)       // ~14.8px (50% of the difference)
 * moderateScale(16, 0.3)  // ~15.3px (30% of the difference)
 * moderateScale(16, 0)    // 16px (no scaling)
 * moderateScale(16, 1)    // ~13.6px (full linear scaling)
 */
const moderateScale = (size: number, factor = 0.5): number => size + (scale(size) - size) * factor;

/**
 * Shorthand alias for moderateScale()
 */
export const ms = moderateScale;

/**
 * Moderate vertical scale - like moderateScale but based on height
 * Use for elements that need height-based scaling with dampening
 *
 * @param size - Size in points (designed for iPhone 17 Pro Max)
 * @param factor - Scaling factor (0-1), default 0.5
 * @returns Scaled size for current device
 */
const moderateVerticalScale = (size: number, factor = 0.5): number =>
  size + (verticalScale(size) - size) * factor;

/**
 * Shorthand alias for moderateVerticalScale()
 */
export const mvs = moderateVerticalScale;
