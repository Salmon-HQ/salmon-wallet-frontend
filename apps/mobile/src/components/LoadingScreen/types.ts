/**
 * LoadingScreen types
 */
import type { LoadingScreenBaseProps } from '@salmon/shared';

/**
 * Props for the LoadingScreen component (React Native)
 * Extends base props with React Native-specific options
 */
export interface LoadingScreenProps extends LoadingScreenBaseProps {
  /**
   * Space to reserve at the bottom for chrome that floats over this screen
   * (e.g. the tab bar). Shrinks the centred content box and lifts the tips
   * clear of it. Default 0 for surfaces with nothing floating over them.
   */
  bottomOffset?: number;
}
