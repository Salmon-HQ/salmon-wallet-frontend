import type { CSSProperties } from 'react';
import type { WalletFamilyPropsBase } from '@salmon/shared';

/** The DOM half of `WalletFamilyPropsBase`: the contract plus a style. */
export interface WalletFamilyProps extends WalletFamilyPropsBase {
  style?: CSSProperties;
  className?: string;
}
