/**
 * NFT domain types.
 *
 * Canonical source of truth for NFT data structures used across
 * blockchain services, API services, and utility functions.
 *
 * @module types/nft
 */

// ============================================================================
// NFT metadata types
// ============================================================================

/**
 * NFT mint information
 */
export interface NftMint {
  /** Mint address */
  address: string;
}

/**
 * NFT collection information
 */
export interface NftCollection {
  /** Collection key/address */
  key: string;
  /** Whether the collection is verified */
  verified: boolean;
  /** Collection name (optional, may come from metadata) */
  name?: string;
}

/**
 * NFT edition information
 */
export interface NftEdition {
  /** Whether this is the original edition */
  isOriginal: boolean;
}

/**
 * NFT creator information
 */
export interface NftCreator {
  /** Creator address */
  address: string;
  /** Creator share percentage */
  share: number;
  /** Whether the creator is verified */
  verified: boolean;
}

/**
 * NFT attribute/trait
 */
export interface NftAttribute {
  /** Trait type/name */
  trait_type: string;
  /** Trait value */
  value: string | number;
}

/**
 * NFT extra metadata
 */
export interface NftExtras {
  /** NFT attributes/traits */
  attributes: NftAttribute[];
  /** Additional properties from metadata */
  properties: Record<string, unknown>;
  /** NFT creators */
  creators: NftCreator[];
}

/**
 * Token2022 extension information
 */
export interface Token2022Extension {
  /** Extension type */
  extension: string;
  /** Extension state */
  state: Record<string, unknown>;
}

// ============================================================================
// Complete NFT data structure
// ============================================================================

/**
 * Complete NFT data structure
 */
export interface Nft {
  /** Mint information */
  mint: NftMint;
  /** Owner address */
  owner: string;
  /** NFT name */
  name: string;
  /** NFT symbol */
  symbol: string;
  /** Metadata URI */
  uri: string;
  /** Raw JSON metadata */
  json: Record<string, unknown>;
  /** Update authority address */
  updateAuthorityAddress: string | null;
  /** Seller fee basis points (royalties) */
  sellerFeeBasisPoints: number;
  /** Collection information */
  collection: NftCollection | null;
  /** Edition information */
  edition: NftEdition | null;
  /** Token standard (e.g., 'ProgrammableNFT', 'NonFungible') */
  tokenStandard: string | null;
  /** Media URL (image, video, etc.) */
  media: string | null;
  /** NFT description */
  description: string;
  /** Whether the NFT is compressed (cNFT) */
  compressed: boolean;
  /** Extra metadata */
  extras: NftExtras;
  /** Token2022 extensions (if applicable) */
  extensions: Token2022Extension[];
  /** Whether the NFT is blacklisted */
  blacklisted?: boolean;
  /** Server-emitted spam score (count of triggered heuristics, 0 = clean). */
  spamScore?: number;
  /** Server-emitted heuristic codes that fired. */
  spamReasons?: string[];
  /** Whether the NFT has pending operations */
  pending?: boolean;
  /** Marketplace info (if listed) */
  marketInfo?: Record<string, unknown>;
}

// ============================================================================
// Pagination & grouping
// ============================================================================

/**
 * Pagination information
 */
export interface NftPagination {
  /** Total number of NFTs */
  total: number;
  /** Page size limit */
  limit: number;
  /** Current offset */
  offset: number;
  /** Whether there are more NFTs to fetch */
  hasMore: boolean;
  /** Offset for next page (null if no more pages) */
  nextOffset: number | null;
}

/**
 * Paginated NFT response
 */
export interface NftPaginatedResponse {
  /** Array of NFTs */
  data: Nft[];
  /** Pagination information */
  pagination: NftPagination;
}

/**
 * NFT collection group (for grouped display)
 */
export interface NftCollectionGroup {
  /** Collection name */
  collection: string;
  /** Number of NFTs in collection */
  length: number;
  /** NFTs in this collection */
  items: Nft[];
  /** Thumbnail URL (first NFT's media) */
  thumb: string | null;
}

// ============================================================================
// Dependency injection function signatures
// ============================================================================

export type FetchNftsFromBackendFn = (
  networkId: string,
  publicKey: string,
  noCache: boolean,
  opts?: { includeSpam?: boolean }
) => Promise<Nft[]>;

export type FetchNftsFromBackendPaginatedFn = (
  networkId: string,
  publicKey: string,
  options: GetNftsOptions
) => Promise<NftPaginatedResponse>;

export type FetchNftByAddressFn = (networkId: string, mintAddress: string) => Promise<Nft | null>;

/**
 * Options for fetching NFTs
 */
export interface GetNftsOptions {
  /** Number of NFTs to fetch (default: 50, max: 100) */
  limit?: number;
  /** Offset for pagination (default: 0) */
  offset?: number;
  /** Whether to bypass cache (default: false) */
  noCache?: boolean;
}

// ============================================================================
// NFT burn transaction types
// ============================================================================

/**
 * Parameters for creating a listing transaction
 */
export interface ListNftParams {
  /** NFT token/mint address */
  tokenAddress: string;
  /** Seller's wallet address */
  sellerAddress: string;
  /** Listing price in SOL */
  price: number;
}

/**
 * Parameters for removing a listing
 */
export interface UnlistNftParams {
  /** NFT token/mint address */
  tokenAddress: string;
  /** Seller's wallet address */
  sellerAddress: string;
}

/**
 * Parameters for buying an NFT
 */
export interface BuyNftParams {
  /** NFT token/mint address */
  tokenAddress: string;
  /** Buyer's wallet address */
  buyerAddress: string;
  /** Purchase price in SOL */
  price: number;
}

/**
 * Parameters for placing a bid
 */
export interface PlaceBidParams {
  /** NFT token/mint address */
  tokenAddress: string;
  /** Bidder's wallet address */
  buyerAddress: string;
  /** Bid amount in SOL */
  price: number;
}

/**
 * Parameters for canceling a bid
 */
export interface CancelBidParams {
  /** NFT token/mint address */
  tokenAddress: string;
  /** Bidder's wallet address */
  buyerAddress: string;
}

/**
 * Parameters for burning an NFT
 */
export interface BurnNftParams {
  /** NFT mint address */
  mintAddress: string;
  /** Owner's wallet address */
  ownerAddress: string;
}

/**
 * Response containing a serialized transaction
 */
export interface PreparedNftTransaction {
  /** Base64 encoded serialized transaction */
  transaction: string;
  /** Optional flow step identifier */
  step?: string;
  /** Optional lookup table address when the step provisions one */
  lookupTableAddress?: string;
  /** Optional expected address count after the step lands on-chain */
  expectedLookupTableAddressCount?: number;
  /** Optional message or instruction */
  message?: string;
}

export interface NftLookupTableInfo {
  /** Whether this burn requires a lookup table flow */
  required: boolean;
  /** Rent-exempt amount locked in the LUT account */
  estimatedRentLamports: number;
  /** Human-readable SOL estimate for the LUT rent */
  estimatedRentSol: number;
  /** Number of addresses stored in the LUT */
  addressCount: number;
  /** Number of extend transactions required before burn */
  extendTransactionCount: number;
}

export interface PreparedNftTransactionResponse {
  /** Base64 encoded serialized transaction */
  transaction?: string;
  /** Optional multi-step transaction flow */
  transactions?: PreparedNftTransaction[];
  /** Optional lookup table metadata for multi-step flows */
  lookupTable?: NftLookupTableInfo;
  /** Optional message or instruction */
  message?: string;
}

/**
 * NFT listing information
 */
export interface NftListing {
  /** NFT token/mint address */
  tokenAddress: string;
  /** Seller's wallet address */
  sellerAddress: string;
  /** Listing price in SOL */
  price: number;
  /** Marketplace where listed */
  marketplace?: string;
  /** Listing creation timestamp */
  createdAt?: string;
  /** NFT metadata (if available) */
  metadata?: {
    name?: string;
    image?: string;
    collection?: string;
  };
}

/**
 * Bid information
 */
export interface NftBid {
  /** NFT token/mint address */
  tokenAddress: string;
  /** Bidder's wallet address */
  buyerAddress: string;
  /** Bid amount in SOL */
  price: number;
  /** Marketplace where bid was placed */
  marketplace?: string;
  /** Bid creation timestamp */
  createdAt?: string;
  /** Bid expiration timestamp */
  expiresAt?: string;
  /** NFT metadata (if available) */
  metadata?: {
    name?: string;
    image?: string;
    collection?: string;
  };
}

// ============================================================================
// Bitcoin Ordinal types
// ============================================================================

/**
 * Ordinal attribute from metadata
 */
export interface OrdinalAttribute {
  trait_type: string;
  value: string | number;
}

/**
 * Bitcoin Ordinal/Inscription data structure (matches backend response)
 */
export interface BitcoinOrdinal {
  /** Standard type */
  standard: 'ORDINAL';
  /** Inscription ID */
  inscriptionId: string;
  /** Sequential inscription number */
  inscriptionNumber: number;
  /** Same as inscriptionId, for consistency */
  mint: string;
  /** Owner Bitcoin address */
  owner: string;
  /** Ordinal name */
  name: string;
  /** Description */
  description?: string;
  /** Content MIME type */
  contentType: string;
  /** Content URI */
  uri?: string;
  /** Media/preview image URL */
  media?: string;
  /** Sat rarity (common, uncommon, rare, epic, legendary, mythic) */
  satRarity: string;
  /** Collection info */
  collection?: {
    name: string;
    symbol?: string;
    slug?: string;
  };
  /** Extra metadata */
  extras: {
    /** Ordinal sat number */
    sat?: number;
    /** Genesis transaction ID */
    genesisTransaction?: string;
    /** Genesis block height */
    genesisHeight?: number;
    /** UTXO output */
    output?: string;
    /** Output value in sats */
    outputValue?: number;
    /** Ordinal attributes/traits */
    attributes?: OrdinalAttribute[];
    properties?: {
      inscriptionNumber?: number;
      contentType?: string;
    };
  };
  /** Whether ordinal is blacklisted */
  blacklisted?: boolean;
}
