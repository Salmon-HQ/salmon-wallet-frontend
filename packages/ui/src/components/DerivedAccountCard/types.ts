import type { CSSProperties } from 'react';
import type { DerivedAccountCardPropsBase } from '@salmon/shared';

/** The DOM half of `DerivedAccountCardPropsBase`: the contract plus a style. */
export interface DerivedAccountCardProps extends DerivedAccountCardPropsBase {
  style?: CSSProperties;
  className?: string;
}

export interface DerivedAccountCardSkeletonProps {
  style?: CSSProperties;
  className?: string;
}
