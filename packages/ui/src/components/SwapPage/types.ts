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
 * SwapPage — the Swap Powerup's Home sub-tab on the DOM: the form and the
 * receipt in one component. The host hands it what mobile's `SwapTab` reads
 * from the accounts context. There is no way out of it: the user leaves by
 * choosing another sub-tab.
 */
export interface SwapPageProps extends SwapScreenPropsBase<CSSProperties> {
  /** A watch-only wallet holds no key: the tab refuses, the host says why. */
  watchOnly?: boolean;
}
