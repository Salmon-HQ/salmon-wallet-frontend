/**
 * Trusted-app / permission types.
 *
 * @module types/trusted-app
 */

/**
 * Trusted app metadata.
 */
export interface TrustedApp {
  /** App display name */
  name?: string;
  /** App icon URL */
  icon?: string;
  /** The address the user saw and approved when trusting this origin */
  address?: string;
}

/**
 * Trusted apps indexed by domain, grouped by network.
 */
export type TrustedApps = Record<string, Record<string, TrustedApp>>;

// ============================================================================
// DApp API types (moved from api/services/dapp.ts)
// ============================================================================

/**
 * DApp metadata response from the backend
 */
export interface DappMetadata {
  /** DApp icon URL (favicon or custom icon) */
  icon?: string;
  /** DApp name or title */
  name?: string;
  /** DApp description */
  description?: string;
  /** DApp URL (canonical) */
  url?: string;
}

/**
 * Parameters for fetching dApp metadata
 */
export interface GetMetadataParams {
  /** The URL of the dApp to fetch metadata for */
  url: string;
}
