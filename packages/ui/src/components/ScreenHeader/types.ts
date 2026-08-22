/**
 * ScreenHeader types for web version
 */
import type { Testable } from '@salmon/shared';

export interface ScreenHeaderProps extends Testable {
  /** Callback when back button is clicked */
  onBack?: () => void;
  /**
   * Glyph for the leading affordance. `close` for screens the affordance
   * exits rather than backs out of — declining advances, so a back chevron
   * would describe the wrong direction.
   */
  glyph?: 'back' | 'close';
  /** Accessible name for the affordance. Defaults to "Go back". */
  backLabel?: string;
  /** Show step indicator */
  stepIndicator?: {
    totalSteps: number;
    currentStep: number;
  };
  /** Disable back button */
  backDisabled?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Additional styles */
  style?: React.CSSProperties;
}
