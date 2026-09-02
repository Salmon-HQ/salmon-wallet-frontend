import type { ReactNode } from 'react';

import type { Testable } from './testable';

export interface ScreenHeaderPropsBase extends Testable {
  /** Callback when the leading affordance is pressed. */
  onBack?: () => void;
  /**
   * Glyph for the leading affordance. `close` for screens the affordance
   * exits rather than backs out of.
   */
  glyph?: 'back' | 'close';
  /** Accessible name for the affordance. Defaults to "Go back". */
  backLabel?: string;
  /** Show the step indicator between the affordance and the trailing spacer. */
  stepIndicator?: {
    totalSteps: number;
    currentStep: number;
  };
  backDisabled?: boolean;
  /** Screen title, drawn on the affordance's own row. */
  title?: string;
  /** A mark drawn immediately before the title. Only meaningful with `title`. */
  titleGlyph?: ReactNode;
  /** Supporting line under the title. Only meaningful with `title`. */
  subtitle?: string;
}
