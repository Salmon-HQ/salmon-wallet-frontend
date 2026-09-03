import type { NftAttribute, Nft } from '../types/nft';

export type { NftAttribute };

// ============================================================================
// NFT Data Types (shared between packages)
// ============================================================================

/**
 * Blockchain type for NFTs
 */
export type NftBlockchain = 'solana' | 'bitcoin';

/**
 * Base NFT data structure shared across all blockchains
 */
export interface NftDataBase {
  mint: string;
  name: string;
  image?: string;
  collectionName?: string;
  description?: string;
  attributes?: NftAttribute[];
  blockchain: NftBlockchain;
  blacklisted?: boolean;
  /** Server-emitted spam score (count of triggered heuristics, 0 = clean). */
  spamScore?: number;
  /** Server-emitted heuristic codes that fired. */
  spamReasons?: string[];
}

/**
 * Solana-specific NFT fields
 */
export interface SolanaNftData extends NftDataBase {
  blockchain: 'solana';
  compressed?: boolean;
  tokenStandard?: string;
  collectionKey?: string;
  collectionVerified?: boolean;
  symbol?: string;
  updateAuthority?: string;
  royaltyBps?: number;
}

/**
 * Bitcoin Ordinal-specific fields
 */
export interface BitcoinNftData extends NftDataBase {
  blockchain: 'bitcoin';
  inscriptionId: string;
  inscriptionNumber: number;
  contentType: string;
  satRarity?: string;
  sat?: number;
  genesisTransaction?: string;
  genesisHeight?: number;
}

/**
 * Union type for all blockchain NFT types
 */
export type NftData = SolanaNftData | BitcoinNftData;

/**
 * Simplified NFT data for components that don't need blockchain-specific fields
 */
export type NftDataSimple = Pick<NftDataBase, 'mint' | 'name' | 'image' | 'collectionName'>;

/**
 * Check if content type is displayable as an image
 *
 * @param contentType - MIME type of the content
 * @returns Whether the content can be displayed as an image
 */
export function isImageContent(contentType: string): boolean {
  const imageTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/avif',
  ];
  return imageTypes.includes(contentType.toLowerCase());
}

/**
 * Check if an image URL points to an SVG.
 * Detects .svg extension and data:image/svg+xml data URIs.
 */
export function isSvgImage(url: string | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.startsWith('data:image/svg+xml')) return true;
  try {
    const pathname = new URL(lower).pathname;
    return pathname.endsWith('.svg');
  } catch {
    return lower.endsWith('.svg');
  }
}

/**
 * Check if an image URL points to an animated image (GIF).
 */
export function isAnimatedImage(url: string | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  try {
    const pathname = new URL(lower).pathname;
    return pathname.endsWith('.gif');
  } catch {
    return lower.endsWith('.gif');
  }
}

/**
 * Solana NFT structure from Helius DAS API (internal format)
 */
export interface SolanaNftFromHelius {
  mint: { address: string };
  owner?: string;
  name: string;
  symbol?: string;
  uri?: string;
  description?: string;
  media?: string;
  compressed?: boolean;
  tokenStandard?: string;
  collection?: {
    key: string;
    verified: boolean;
    name?: string;
  };
  updateAuthorityAddress?: string | null;
  sellerFeeBasisPoints?: number;
  blacklisted?: boolean;
  spamScore?: number;
  spamReasons?: string[];
  extras?: {
    attributes?: Array<{ trait_type: string; value: string | number }>;
    properties?: Record<string, unknown>;
    creators?: Array<{ address: string; share: number; verified: boolean }>;
  };
}

/**
 * Convert Solana NFT to NftData format for UI components
 * Includes all Solana-specific fields
 *
 * @param nft - Solana NFT from Helius DAS API
 * @returns SolanaNftData for UI components
 */
export function solanaNftToNftData(nft: SolanaNftFromHelius): SolanaNftData {
  return {
    blockchain: 'solana',
    mint: nft.mint.address,
    name: nft.name,
    image: nft.media,
    description: nft.description,
    collectionName: nft.collection?.name,
    attributes: nft.extras?.attributes as NftAttribute[],
    blacklisted: nft.blacklisted ?? false,
    spamScore: nft.spamScore,
    spamReasons: nft.spamReasons,
    // Solana-specific fields
    compressed: nft.compressed,
    tokenStandard: nft.tokenStandard,
    collectionKey: nft.collection?.key,
    collectionVerified: nft.collection?.verified,
    symbol: nft.symbol,
    updateAuthority: nft.updateAuthorityAddress ?? undefined,
    royaltyBps: nft.sellerFeeBasisPoints,
  };
}

/**
 * Convert canonical Nft (from getAllNfts) to SolanaNftData for UI.
 * Different from solanaNftToNftData which takes SolanaNftFromHelius.
 * The Nft type uses `null` where SolanaNftFromHelius uses `undefined`,
 * so this handles the conversion.
 */
export function canonicalNftToSolanaNftData(nft: Nft): SolanaNftData {
  return {
    blockchain: 'solana',
    mint: nft.mint.address,
    name: nft.name || 'Unnamed NFT',
    image: nft.media || undefined,
    description: nft.description || undefined,
    collectionName: nft.collection?.name || undefined,
    attributes: nft.extras?.attributes,
    blacklisted: nft.blacklisted ?? false,
    spamScore: nft.spamScore,
    spamReasons: nft.spamReasons,
    compressed: nft.compressed,
    tokenStandard: nft.tokenStandard || undefined,
    collectionKey: nft.collection?.key,
    collectionVerified: nft.collection?.verified,
    symbol: nft.symbol || undefined,
    updateAuthority: nft.updateAuthorityAddress ?? undefined,
    royaltyBps: nft.sellerFeeBasisPoints,
  };
}

/**
 * Type guard to check if NFT is from Solana
 */
export function isSolanaNft(nft: NftData): nft is SolanaNftData {
  return nft.blockchain === 'solana';
}

/**
 * Type guard to check if NFT is from Bitcoin
 */
export function isBitcoinNft(nft: NftData): nft is BitcoinNftData {
  return nft.blockchain === 'bitcoin';
}

/**
 * Get rarity display color for Bitcoin ordinals
 */
export function getSatRarityColor(rarity?: string): string {
  switch (rarity?.toLowerCase()) {
    case 'mythic':
      return '#FF00FF'; // Magenta
    case 'legendary':
      return '#FFD700'; // Gold
    case 'epic':
      return '#9400D3'; // Purple
    case 'rare':
      return '#00BFFF'; // Light blue
    case 'uncommon':
      return '#32CD32'; // Lime green
    case 'common':
    default:
      return '#808080'; // Gray
  }
}

// ============================================================================
// Multi-chain NFT Section Types
// ============================================================================

/**
 * Section key for multi-chain NFT display.
 * Combines blockchain + network for testnet support.
 */
export type NftSectionKey = 'solana' | 'solana-devnet';

/**
 * State for a single NFT section (one blockchain+network).
 */
export interface NftSection {
  nfts: NftData[];
  loading: boolean;
  blockchain: NftBlockchain;
  networkLabel?: string;
  isTestnet: boolean;
}

/**
 * All NFT sections grouped by section key.
 */
export type NftsBySection = Record<NftSectionKey, NftSection>;
