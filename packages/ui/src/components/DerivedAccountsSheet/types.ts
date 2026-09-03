import type { CSSProperties } from 'react';
import type { DerivedAccountsSheetPropsBase } from '@salmon/shared';

/** The DOM half of `DerivedAccountsSheetPropsBase`: the contract plus a style. */
export interface DerivedAccountsSheetProps extends DerivedAccountsSheetPropsBase {
  style?: CSSProperties;
  className?: string;
}
