/**
 * Token data structure for the TokenSelector component
 */
export interface TokenSelectorToken {
  /** Token mint address (Solana) or contract address (EVM) */
  mint?: string;
  /** Token contract address */
  address?: string;
  /** Token display name */
  name?: string;
  /** Token symbol (e.g., SOL, USDC) */
  symbol?: string;
  /** Token logo URL */
  logo?: string;
  /** User's balance amount (formatted for display) */
  uiAmount?: number;
  /** Network identifier (e.g., 'solana', 'ethereum') */
  network?: string;
}

/**
 * Return type for useTokenSearch hook
 */
export interface UseTokenSearchResult {
  /** Current search query */
  searchQuery: string;
  /** Set the search query */
  setSearchQuery: (query: string) => void;
  /** Tokens to display (filtered or search results) */
  displayTokens: TokenSelectorToken[];
  /** Whether a search is in progress */
  isSearching: boolean;
  /** Paginated tokens for display */
  paginatedTokens: TokenSelectorToken[];
  /** Whether there are more tokens to load */
  hasMore: boolean;
  /** Load more tokens */
  loadMore: () => void;
  /** Reset search state */
  reset: () => void;
  /** Re-run the current query after a failed search */
  retry: () => void;
  /** Error message if search failed */
  error: string | null;
  /** Whether an error occurred */
  isError: boolean;
}

/**
 * Props for the TokenSelector component (base - platform-agnostic)
 */
export interface TokenSelectorPropsBase<TStyle> {
  /** Current input value (amount) */
  value: string;
  /** Callback when input value changes */
  onChangeValue: (value: string) => void;
  /** List of tokens available for selection */
  tokens: TokenSelectorToken[];
  /** Featured tokens to display at the top of the modal */
  featuredTokens?: TokenSelectorToken[];
  /** Callback when a token is selected */
  onTokenSelect: (token: TokenSelectorToken) => void;
  /** Currently selected token */
  selectedToken?: TokenSelectorToken;
  /** Async search function for external token search */
  onSearch?: (query: string) => Promise<TokenSelectorToken[]>;
  /** Input placeholder text */
  placeholder?: string;
  /** Whether to hide balance values */
  hiddenBalance?: boolean;
  /** Show network chip on token items */
  showNetworkChip?: boolean;
  /** Show disclaimer for verified tokens */
  showVerifiedDisclaimer?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Platform-specific style prop */
  style?: TStyle;
}

/**
 * Props for the TokenSelectorModal component (base - platform-agnostic)
 */
export interface TokenSelectorModalPropsBase<TStyle> {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** List of tokens to display */
  tokens: TokenSelectorToken[];
  /** Featured tokens to display at the top */
  featuredTokens?: TokenSelectorToken[];
  /** Callback when a token is selected */
  onSelect: (token: TokenSelectorToken) => void;
  /** Async search function for external token search */
  onSearch?: (query: string) => Promise<TokenSelectorToken[]>;
  /** Whether to hide balance values */
  hiddenBalance?: boolean;
  /** Show network chip on token items */
  showNetworkChip?: boolean;
  /** Show disclaimer for verified tokens */
  showVerifiedDisclaimer?: boolean;
  /** Whether tokens are still loading */
  loading?: boolean;
  /** Platform-specific style prop */
  style?: TStyle;
}
