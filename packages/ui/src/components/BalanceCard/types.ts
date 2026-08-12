import type {
  BalanceCardCarouselPropsBase,
  BalanceCardPropsBase,
  BlockchainId,
} from '@salmon/shared';
import type { CSSProperties } from 'react';

/**
 * Props for the BalanceCard component (Web/Extension)
 */
export interface BalanceCardProps extends BalanceCardPropsBase<CSSProperties> {
  /** Optional CSS class name */
  className?: string;
  /** Blockchain identifier for theming */
  blockchain?: BlockchainId;
  /** Show network label (Devnet, Testnet, etc.) */
  showNetworkLabel?: boolean;
}

/**
 * Props for the BalanceCardCarousel component (Web/Extension)
 */
export interface BalanceCardCarouselProps extends BalanceCardCarouselPropsBase<CSSProperties> {
  /** Optional CSS class name */
  className?: string;
}
