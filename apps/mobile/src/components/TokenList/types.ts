import type { NativeScrollEvent, NativeSyntheticEvent, ViewStyle } from 'react-native';
import type { Token } from '@salmon/shared';

/**
 * Blockchain identifier for styling variations
 */
export type BlockchainType = 'solana' | 'bitcoin' | 'ethereum';

/**
 * Props for the TokenListItem component
 */
export interface TokenListItemProps {
  /** Token data to display */
  token: Token;
  /** Callback when token item is pressed (omit to render non-pressable) */
  onPress?: (token: Token) => void;
  /** Whether to hide balance values */
  hiddenBalance?: boolean;
  /** Current blockchain for layout variations (Bitcoin has different layout) */
  blockchain?: BlockchainType;
  /** Optional custom styles for the container */
  style?: ViewStyle;
}

/**
 * Props for the TokenList component
 */
export interface TokenListProps {
  /** Array of tokens to display */
  tokens: Token[];
  /** Whether the list is in a loading state */
  loading?: boolean;
  /** Callback when a token is pressed */
  onTokenPress: (token: Token) => void;
  /** Whether to hide balance values (privacy mode) */
  hiddenBalance?: boolean;
  /** Component to render above the list (for avoiding ScrollView nesting) */
  ListHeaderComponent?: React.ReactElement | null;
  /** Component to render when list is empty */
  ListEmptyComponent?: React.ReactElement | null;
  /**
   * Called when the user pulls to refresh. The list raises its own refresh
   * affordance for the duration of the returned promise and for nothing else —
   * a background refetch the user did not ask for must never raise it.
   */
  onRefresh?: () => void | Promise<void>;
  /** Style for the list content container */
  contentContainerStyle?: object;
  /** Current blockchain for layout variations */
  blockchain?: BlockchainType;
  /** Callback when list is scrolled */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** How often to fire scroll events (ms) */
  scrollEventThrottle?: number;
}

/**
 * Props for the TokenListSkeleton component
 */
export interface TokenListSkeletonProps {
  /** Number of skeleton items to show */
  count?: number;
}
