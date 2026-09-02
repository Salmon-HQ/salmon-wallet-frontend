/**
 * Props for the StepIndicator component — the one contract both platforms
 * read; there is nothing platform-specific to add on either side.
 */
export interface StepIndicatorPropsBase {
  /** Total number of steps */
  totalSteps: number;
  /** Current step (1-indexed) */
  currentStep: number;
}

/** @deprecated Read `StepIndicatorPropsBase`. Kept for the existing consumers. */
export type StepIndicatorProps = StepIndicatorPropsBase;
