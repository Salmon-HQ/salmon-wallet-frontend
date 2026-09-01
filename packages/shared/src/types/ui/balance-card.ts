import type { NetworkInfo } from '../ui';

/**
 * Supported blockchain types for the carousel
 */
export type BlockchainId =
  'solana' | 'solana-devnet' | 'bitcoin' | 'bitcoin-testnet' | 'ethereum' | 'ethereum-sepolia';

/**
 * Extended network info with blockchain type
 */
export interface BlockchainNetworkInfo extends NetworkInfo {
  /** Blockchain identifier for theming */
  blockchain: BlockchainId;
}

/**
 * Balance data for a single blockchain in the carousel
 */
export interface BlockchainBalance {
  /** Blockchain/network information */
  network: BlockchainNetworkInfo;
  /** Total balance in USD */
  usdTotal: number | undefined;
  /** 24-hour change percentage */
  changePercent?: number;
  /** 24-hour change in USD */
  changeAmount?: number;
  /** Whether data is loading */
  loading?: boolean;
}

/**
 * Props for the BalanceCard component (base - platform-agnostic)
 */
export interface BalanceCardPropsBase<TStyle> {
  /** Current network information */
  network: NetworkInfo;
  /** Total balance in USD */
  usdTotal: number | undefined;
  /** 24-hour change percentage */
  changePercent?: number;
  /** 24-hour change in USD */
  changeAmount?: number;
  /** Whether balance is hidden (privacy mode) */
  hiddenBalance?: boolean;
  /** Callback when eye icon is pressed */
  onToggleVisibility?: () => void;
  /** Callback when network selector is pressed (for future multi-network) */
  onNetworkPress?: () => void;
  /** Index for pagination dots (for future multi-network carousel) */
  currentIndex?: number;
  /** Total count for pagination dots */
  totalCount?: number;
  /** Whether the card is in loading state */
  loading?: boolean;
  /** Optional custom styles for the container */
  style?: TStyle;
}

/**
 * Props for the BalanceCardCarousel component (base - platform-agnostic)
 */
export interface BalanceCardCarouselPropsBase<TStyle> {
  /** Array of blockchain balances to display */
  blockchains: BlockchainBalance[];
  /** Whether balance is hidden (privacy mode) */
  hiddenBalance?: boolean;
  /** Callback when eye icon is pressed */
  onToggleVisibility?: () => void;
  /** Callback when user swipes to a different blockchain */
  onBlockchainChange?: (blockchain: BlockchainId, index: number) => void;
  /** Currently active blockchain index (controlled mode) */
  activeIndex?: number;
  /** Show network label (Devnet, Testnet, etc.) - typically enabled in developer mode */
  showNetworkLabel?: boolean;
  /** Optional custom styles for the container */
  style?: TStyle;
  /** Test ID for testing */
  testID?: string;
}
