import type { CSSProperties, ReactNode } from 'react';
import type { BottomSheetContainerPropsBase, SheetTitlePropsBase } from '@salmon/shared';

/** The DOM half of `SheetTitlePropsBase`: the contract plus a style. */
export interface SheetTitleProps extends SheetTitlePropsBase {
  style?: CSSProperties;
  className?: string;
}

/** The DOM half of `BottomSheetContainerPropsBase`: the contract plus a style. */
export interface BottomSheetContainerProps extends BottomSheetContainerPropsBase {
  /**
   * Optional background element that replaces the sheet's default
   * thermocline ground — mirrors mobile's `background` extra. Mounted behind
   * everything else in the sheet.
   */
  background?: ReactNode;
  /** Layout the parent owns. */
  style?: CSSProperties;
  className?: string;
}
