/**
 * The Swap Powerup's screen contracts — one per pair, both twins extend them
 * (`apps/mobile/src/components/SwapScreen`, `packages/ui/src/components/SwapPage`).
 * Review and signing are core's `TransactionConfirmation`, not the Powerup's.
 */
import type { SwapToken } from '../swap';
import type { SwapErrorMessage } from '../../powerups/swap/types';
import type {
  UseSwapScreenLogicParams,
  UseSwapScreenLogicResult,
} from '../../powerups/swap/useSwapScreenLogic';

/** The amount field with its token selector, "You Send" and "You Receive". */
export interface SwapAmountInputPropsBase<TStyle> {
  label: string;
  value: string;
  onChangeValue: (value: string) => void;
  token: SwapToken | null;
  onTokenPress: () => void;
  usdValue?: number;
  /** Available balance (for "You Send") */
  availableBalance?: number;
  editable?: boolean;
  placeholder?: string;
  style?: TStyle;
  /** Show loading state for amount */
  isLoading?: boolean;
  /** The card wears the accent edge — a balance fill is lit under it. */
  highlighted?: boolean;
}

/** The form: pair, amounts, the notice slot and the swap control. */
export interface SwapInputScreenPropsBase<TStyle> {
  inToken: SwapToken | null;
  outToken: SwapToken | null;
  inAmount: string;
  outAmount: string;
  onInAmountChange: (value: string) => void;
  onInTokenPress: () => void;
  onOutTokenPress: () => void;
  inUsdValue?: number;
  /** Fiat value of the quoted receive amount, under the "You Receive" number. */
  outUsdValue?: number | null;
  isLoadingQuote?: boolean;
  /** Whether the swap control is enabled */
  canSwap: boolean;
  /** Warning shown while the form cannot be submitted */
  reviewWarning?: SwapErrorMessage | null;
  /** The last swap failure */
  swapError?: SwapErrorMessage | null;
  /** The provider's attribution from the current quote, e.g. "Powered by 0x" */
  attribution?: string | null;
  onSwap: () => void;
  style?: TStyle;
}

/** The whole Powerup screen: the host's inputs to the shared logic. */
export interface SwapScreenPropsBase<TStyle> extends Omit<UseSwapScreenLogicParams, 'buildSwap'> {
  style?: TStyle;
}

export type SwapScreenLogic = UseSwapScreenLogicResult;
