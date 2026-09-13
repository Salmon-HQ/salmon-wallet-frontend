/**
 * Salmon's own public addresses — the ones the About screen links to.
 *
 * One list, because both twins link to the same pages and a URL that drifts
 * between platforms sends half the users somewhere else. The support links
 * live with `SUPPORT_OPTIONS` in `types/settings.ts` for the same reason.
 */
export const SALMON_LINKS = {
  website: 'https://www.salmonwallet.io',
  twitter: 'https://x.com/salmonwallet',
  github: 'https://github.com/salmon-wallet',
  medium: 'https://medium.com/@salmonwallet',
  privacy: 'https://www.salmonwallet.io/privacy',
  terms: 'https://www.salmonwallet.io/terms',
} as const;
