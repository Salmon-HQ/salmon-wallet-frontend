import type { Testable } from './testable';

/**
 * The "About" card of a token's detail screen: description, contract address
 * copy row, website link. Mobile's `AboutCard` and the DOM's `TokenAbout` read
 * this one shape; the card renders nothing when every field is absent, and a
 * skeleton while `loading`.
 */
export interface TokenAboutPropsBase extends Testable {
  description?: string;
  /** Omit when the asset has no on-chain contract address to show (e.g. Bitcoin). */
  contractAddress?: string;
  /** The short form the row prints; the full address is what gets copied. */
  contractAddressShort?: string;
  website?: string;
  loading?: boolean;
}
