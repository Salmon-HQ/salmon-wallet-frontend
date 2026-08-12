import type { CSSProperties } from 'react';
import type {
  BridgeScreenChain as BridgeChain,
  BridgeScreenToken as BridgeToken,
  BridgeScreenEstimate as BridgeEstimate,
  BridgeScreenExchange as BridgeExchange,
  BridgeRecipientScreenPropsBase,
  BridgeReviewScreenPropsBase,
} from '@salmon/shared';

// Re-export shared data types for consumers
export type { BridgeChain, BridgeToken, BridgeEstimate, BridgeExchange };

/**
 * Props for BridgeRecipientScreen sub-component (Web/Extension)
 */
export interface BridgeRecipientScreenProps extends BridgeRecipientScreenPropsBase<CSSProperties> {}

/**
 * Props for BridgeReviewScreen sub-component (Web/Extension)
 */
export interface BridgeReviewScreenProps extends BridgeReviewScreenPropsBase<CSSProperties> {}
