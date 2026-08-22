/**
 * Address utilities for formatting and displaying blockchain addresses
 */

/**
 * Truncates a blockchain address for display purposes.
 * Shows the first and last characters with ellipsis in between.
 *
 * @param address - The full blockchain address to truncate
 * @param chars - Number of characters to show at the start and end (default: 4)
 * @returns The truncated address string, or undefined if address is falsy
 *
 * @example
 * // Default behavior (4 chars)
 * getShortAddress("0x1234567890abcdef1234567890abcdef12345678")
 * // Returns: "0x12...5678"
 *
 * @example
 * // Custom character count
 * getShortAddress("0x1234567890abcdef1234567890abcdef12345678", 6)
 * // Returns: "0x1234...345678"
 *
 * @example
 * // Solana address
 * getShortAddress("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU")
 * // Returns: "7xKX...sAsU"
 */
export const getShortAddress = (
  address: string | null | undefined,
  chars: number = 4
): string | undefined => {
  if (!address) {
    return undefined;
  }

  if (address.length <= chars * 2 + 3) {
    return address;
  }

  const start = address.slice(0, chars);
  const end = address.slice(-chars);

  return `${start}...${end}`;
};

/**
 * Groups an address into 4-character chunks so the eye can compare a prefix or
 * suffix positionally (DESIGN.md, "The Monospace-Is-For-Scanning Rule").
 *
 * This is a scanning aid, not an anti-homoglyph measure: base58 already
 * excludes `0`, `O`, `I` and `l`, so those confusions cannot occur in a Solana
 * address. Render the result in Geist Mono or the chunks will not line up.
 *
 * @example
 * chunkAddress('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')
 * // Returns: "7xKX tg2C W87d 97TX JSDp bD5j Bkhe TqA8 3TZR uJos gAsU"
 */
export function chunkAddress(address: string | null | undefined): string {
  if (!address) {
    return '';
  }

  return address.replace(/(.{4})/g, '$1 ').trim();
}

export function truncateHash(hash: string, chars: number = 6): string {
  if (!hash || hash.length < chars * 2 + 3) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}
