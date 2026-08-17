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
  SwapTab,
  SwapStepBase,
  SwapScreenStep,
  BridgeTokenSimple,
  BridgeEstimateSimple,
  BridgeExchangeSimple,
} from '@salmon/shared';

// Import generic prop types from shared
import type {
  SwapTabSelectorProps as SwapTabSelectorPropsBase,
  SwapAmountInputProps as SwapAmountInputPropsBase,
  SwapDetailRowProps as SwapDetailRowPropsBase,
  SwapReviewCardProps as SwapReviewCardPropsBase,
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
 * Props for SwapTabSelector component (Web)
 */
export interface SwapTabSelectorProps extends SwapTabSelectorPropsBase<CSSProperties> {}

/**
 * Props for SwapAmountInput component (Web)
 */
export interface SwapAmountInputProps extends SwapAmountInputPropsBase<CSSProperties>, Testable {}

/**
 * Props for SwapDetailRow component (Web)
 */
export interface SwapDetailRowProps extends SwapDetailRowPropsBase<CSSProperties> {}

/**
 * Props for SwapReviewCard component (Web)
 */
export interface SwapReviewCardProps extends SwapReviewCardPropsBase<CSSProperties> {}

/**
 * Props for SwapReviewButtons component (Web)
 */
export interface SwapReviewButtonsProps {
  onBack: () => void;
  onConfirm: () => void;
  isConfirming?: boolean;
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
   * the swap or bridge is signed until its outcome has been acknowledged.
   * Hosts use it to disable navigation that would discard that report.
   */
  onFlowLockChange?: (locked: boolean) => void;
}
