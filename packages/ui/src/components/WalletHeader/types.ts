import type { CSSProperties } from 'react';
import type { WalletHeaderPropsBase } from '@salmon/shared';

/**
 * Props for the WalletHeader component (Web/Extension)
 */
export interface WalletHeaderProps extends WalletHeaderPropsBase<CSSProperties> {
  /** Optional CSS class name */
  className?: string;
}
