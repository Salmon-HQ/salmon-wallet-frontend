import type { NativeScrollEvent, NativeSyntheticEvent, ViewStyle } from 'react-native';
import type { TokenListItemPropsBase, TokenListPropsBase } from '@salmon/shared';

export type { TokenListBlockchain as BlockchainType } from '@salmon/shared';

/** The mobile half of `TokenListItemPropsBase`: the contract plus a style. */
export interface TokenListItemProps extends TokenListItemPropsBase {
  /** Optional custom styles for the container */
  style?: ViewStyle;
}

/**
 * The mobile half of `TokenListPropsBase`: the contract plus the `FlatList`
 * plumbing the Home shell drives — header/empty slots, pull-to-refresh, the
 * content container and the scroll handler the seam fade reads.
 */
export interface TokenListProps extends TokenListPropsBase {
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
  /** Callback when list is scrolled */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** How often to fire scroll events (ms) */
  scrollEventThrottle?: number;
}
