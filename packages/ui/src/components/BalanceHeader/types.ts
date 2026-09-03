import type { CSSProperties } from 'react';
import type { BalanceHeaderPropsBase } from '@salmon/shared';

/**
 * The DOM half of `BalanceHeaderPropsBase`: the contract plus a style.
 *
 * The contract says nothing about how a page is turned, which is the point —
 * mobile swipes, and here the same page change is a keyboard arrow, a click on
 * a dot, or a horizontal wheel (spec 028, DOM alternatives).
 */
export interface BalanceHeaderProps extends BalanceHeaderPropsBase<CSSProperties> {
  className?: string;
}
