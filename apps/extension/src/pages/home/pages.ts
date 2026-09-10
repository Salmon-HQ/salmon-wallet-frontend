/** The pages Home stacks over itself, and how deep each one sits. */

/** Available page views within HomePage. */
export type PageView =
  | 'home'
  | 'tokenDetail'
  | 'nftDetail'
  | 'activity'
  | 'send'
  | 'wallets'
  | 'settings'
  | 'powerups'
  | 'swap';

/**
 * How deep each page sits in the stack — what `SlideStack` reads to tell a
 * push from a pop. Settings sits above the rest because it is reached *from*
 * them (Home, and Wallets), and returns to whichever one opened it.
 */
export const PAGE_DEPTH: Record<PageView, number> = {
  home: 0,
  tokenDetail: 1,
  nftDetail: 1,
  activity: 1,
  send: 1,
  wallets: 1,
  settings: 2,
  // The catalogue rises over Home; a Powerup's screen is pushed from it.
  powerups: 1,
  swap: 2,
};
