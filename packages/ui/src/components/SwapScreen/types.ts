/**
 * SwapScreen types for the extension app (Web)
 *
 * Re-exports shared swap types with CSSProperties for web.
 */
import type { CSSProperties } from 'react';
import type { Testable } from '@salmon/shared';

// Re-export all base types from shared
export type {
  // Network & Chain
  SwapNetworkId,
  SwapChainType,
  // Backend API types
  SwapOrderResponse,
  SwapQuote,
  // UI types
  SwapToken,
  SwapScreenStep,
} from '@salmon/shared';

// Import generic prop types from shared
import type {
  SwapAmountInputProps as SwapAmountInputPropsBase,
  SwapDetailRowProps as SwapDetailRowPropsBase,
  SwapDetailsCardProps as SwapDetailsCardPropsBase,
  SwapReviewExchangeProps as SwapReviewExchangePropsBase,
  SwapReviewScreenProps as SwapReviewScreenPropsBase,
  SwapInputScreenProps as SwapInputScreenPropsBase,
  SwapScreenProps as SwapScreenPropsBase,
  SwapScreenStep,
} from '@salmon/shared';

/**
 * Current step in swap flow (Web version)
 * @deprecated Use SwapScreenStep from @salmon/shared instead
 */
export type SwapStep = SwapScreenStep;

/**
 * Props for SwapAmountInput component (Web)
 */
export interface SwapAmountInputProps extends SwapAmountInputPropsBase<CSSProperties>, Testable {}

/**
 * Props for SwapDetailRow component (Web)
 */
export interface SwapDetailRowProps extends SwapDetailRowPropsBase<CSSProperties> {}

/**
 * Props for SwapDetailsCard component (web)
 */
export interface SwapDetailsCardProps extends SwapDetailsCardPropsBase<CSSProperties> {}

/**
 * Props for SwapReviewExchange component (Web)
 */
export interface SwapReviewExchangeProps extends SwapReviewExchangePropsBase<CSSProperties> {}

/**
 * Props for SwapReviewButtons component (Web)
 */
export interface SwapReviewButtonsProps {
  onBack: () => void;
  onConfirm: () => void;
  isConfirming?: boolean;
  /** Whether a fresh quote/estimate is in flight (see SwapReviewScreenProps) */
  isRefreshing?: boolean;
  confirmLabel?: string;
  style?: CSSProperties;
}

/**
 * Props for SwapReviewScreen sub-component (Web)
 */
export interface SwapReviewScreenProps extends SwapReviewScreenPropsBase<CSSProperties> {}

/**
 * Props for SwapInputScreen sub-component (Web)
 */
export interface SwapInputScreenProps extends SwapInputScreenPropsBase<CSSProperties> {}

/**
 * Props for main SwapScreen component (Web)
 */
export interface SwapScreenProps extends SwapScreenPropsBase<CSSProperties> {
  /**
   * Reports whether the flow currently owns the screen: true from the moment
   * the swap is signed until its outcome has been acknowledged.
   * Hosts use it to disable navigation that would discard that report.
   */
  onFlowLockChange?: (locked: boolean) => void;
  /**
   * Reports when the flow becomes a **task** rather than tab content — review
   * onward. A task has one way out (its own back arrow, which knows the step
   * the user is on); the app chrome around it offers exits that do not, so the
   * host hides the header and tab bar while this is true. Mobile has always
   * done this by presenting review and success in a `Modal`; the DOM apps had
   * no equivalent, which is finding #3 of the flow audit.
   *
   * Separate from `onFlowLockChange`, which starts later (at signature) and
   * governs whether ambient navigation is *allowed*. Hiding chrome must not be
   * mistaken for a guard: the in-flight state still owns the back button.
   */
  onTaskChange?: (isTask: boolean) => void;
}
