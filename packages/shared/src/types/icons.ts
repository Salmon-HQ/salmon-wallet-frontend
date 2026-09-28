/**
 * Unified icon system types for Salmon Wallet
 * Used by both mobile (React Native) and extension (React DOM)
 */

/**
 * Standard icon names used across the application
 * Maps to platform-specific icon libraries:
 * - React Native: Ionicons (@expo/vector-icons)
 * - Web: MUI SvgIcon components
 */
export type IconName =
  // Navigation
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-right'
  | 'chevron-left'
  | 'close'
  | 'back'
  // Actions
  | 'send'
  | 'receive'
  | 'copy'
  | 'refresh'
  | 'settings'
  | 'qr-code'
  | 'scan'
  // Visibility
  | 'eye'
  | 'eye-off'
  // Security
  | 'lock'
  | 'unlock'
  | 'shield'
  | 'key'
  | 'fingerprint'
  // Wallet
  | 'wallet'
  | 'activity'
  // Status
  | 'checkmark'
  | 'checkmark-circle'
  | 'alert'
  | 'alert-circle'
  | 'info'
  | 'info-circle'
  // Token features
  | 'diamond'
  | 'people'
  | 'layers'
  | 'image'
  | 'game-controller'
  | 'analytics'
  | 'trending-up'
  | 'trending-down'
  | 'cash'
  | 'card'
  | 'cloud'
  | 'star'
  | 'heart'
  | 'tag'
  // Misc
  | 'add'
  | 'remove'
  | 'search'
  | 'menu'
  | 'more'
  | 'link'
  | 'external-link';

/**
 * Icon size presets
 */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

/**
 * Base props for Icon components
 */
export interface IconBaseProps {
  /** Icon name from the unified icon set */
  name: IconName;
  /** Icon size (preset or number in pixels) */
  size?: IconSize;
  /** Icon color (defaults to current text color) */
  color?: string;
  /** Accessibility label */
  accessibilityLabel?: string;
}

/**
 * Icon size mapping (in pixels)
 */
export const ICON_SIZES: Record<Exclude<IconSize, number>, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

/**
 * Get numeric size from IconSize
 */
export function getIconSize(size: IconSize = 'md'): number {
  if (typeof size === 'number') return size;
  return ICON_SIZES[size];
}
