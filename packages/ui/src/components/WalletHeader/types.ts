import type { CSSProperties } from 'react';
import type { WalletHeaderPropsBase } from '@salmon/shared';

/**
 * Props for the WalletHeader component (Web/Extension)
 */
export interface WalletHeaderProps extends WalletHeaderPropsBase<CSSProperties> {
  /** Optional CSS class name */
  className?: string;
  /**
   * Opens the Powerups catalogue. DOM-only, like `onRefreshPress`: mobile
   * floats its `PowerupsFab` above the stack; the side panel has no floating
   * layer, so the `+` sits in the header row. Absent when Powerups are
   * compiled out.
   */
  onPowerupsPress?: () => void;
}
