import type { CSSProperties } from 'react';
import type {
  SwapAmountInputPropsBase,
  SwapInputScreenPropsBase,
  SwapScreenPropsBase,
  Testable,
} from '@salmon/shared';

export type { SwapToken } from '@salmon/shared';

/** The DOM half of the Swap Powerup's contracts: the contract plus a style. */
export interface SwapAmountInputProps extends SwapAmountInputPropsBase<CSSProperties>, Testable {}

export interface SwapInputScreenProps extends SwapInputScreenPropsBase<CSSProperties> {}

/**
 * SwapPage — the Swap Powerup on the DOM: the form and the receipt in one
 * component (the DOM has no route stack). The host hands it what mobile's
 * `SwapRoute` reads from the accounts context.
 */
export interface SwapPageProps extends SwapScreenPropsBase<CSSProperties> {
  /** Leave the Powerup. */
  onBack: () => void;
  /** A watch-only wallet holds no key: the page refuses, the host says why. */
  watchOnly?: boolean;
}
