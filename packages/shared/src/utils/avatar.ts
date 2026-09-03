/**
 * Avatar Utilities
 * Migrated from salmon-wallet-v2/src/adapter/services/avatar-service.js
 *
 * Provides avatar URL generation for wallet profiles.
 * Avatars are hosted on static.salmonwallet.io with 25 options (00-24).
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * Base URL for avatar images
 */
export const AVATAR_BASE_URL = 'https://static.salmonwallet.io/avatar';

/**
 * Total number of available preset avatar options (indices 0-24)
 */
export const PRESET_AVATAR_COUNT = 25;

/**
 * Pre-built array of all preset avatar URLs (indices 0-24)
 */
export const PRESET_AVATAR_URLS: string[] = Array.from(
  { length: PRESET_AVATAR_COUNT },
  (_, i) =>
    `${AVATAR_BASE_URL}/${i.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false })}.png`
);

// ============================================================================
// Functions
// ============================================================================

/**
 * Gets the avatar URL for a specific index.
 *
 * @param index - The avatar index (will be zero-padded to 2 digits)
 * @returns The full URL to the avatar image
 *
 * @example
 * getAvatar(1)  // 'https://static.salmonwallet.io/avatar/01.png'
 * getAvatar(12) // 'https://static.salmonwallet.io/avatar/12.png'
 */
export function getAvatar(index: number): string {
  const paddedIndex = index.toLocaleString('en-US', {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
  return `${AVATAR_BASE_URL}/${paddedIndex}.png`;
}

/**
 * Gets a random avatar URL from the available options (0-24).
 *
 * @returns The full URL to a randomly selected avatar image
 *
 * @example
 * getRandomAvatar() // 'https://static.salmonwallet.io/avatar/07.png' (random)
 */
export function getRandomAvatar(): string {
  const randomIndex = Math.floor(Math.random() * PRESET_AVATAR_COUNT);
  return getAvatar(randomIndex);
}

/**
 * Gets the initials from a name for avatar fallback display.
 *
 * - Single word: returns first 2 characters uppercased
 * - Multiple words: returns first letter of first two words uppercased
 * - Empty/falsy: returns '?'
 *
 * @param name - The name to extract initials from
 * @returns Up to 2 characters for initials
 *
 * @example
 * getInitials('Account 1')  // 'A1'
 * getInitials('My Wallet')  // 'MW'
 * getInitials('Savings')    // 'SA'
 * getInitials('')           // '?'
 */
export function getInitials(name: string): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
