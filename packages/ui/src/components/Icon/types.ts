import type { IconName, IconSize } from '@salmon/shared';

/**
 * Props for the unified Icon component
 */
export interface UnifiedIconProps {
  /** Icon name from the unified icon set */
  name: IconName;
  /** Icon size (preset or number in pixels) */
  size?: IconSize;
  /** Icon color (defaults to current text color) */
  color?: string;
  /** Additional CSS class */
  className?: string;
  /** Additional styles */
  style?: React.CSSProperties;
}

// Props accepted by the individual glyph components exported alongside `Icon`.
export type { IconProps } from '../../icons';
