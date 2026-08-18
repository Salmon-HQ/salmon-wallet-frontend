/**
 * Font assets for Salmon Wallet
 *
 * DM Sans - Primary font family (digit advances equalised; see `DMSans-README.md`)
 * Geist Mono - Monospace, for values read character by character
 */

// DM Sans — interface family (four weights; see theme/typography.ts)
export { default as DMSansRegular } from './DMSans-Regular.ttf';
export { default as DMSansMedium } from './DMSans-Medium.ttf';
export { default as DMSansSemiBold } from './DMSans-SemiBold.ttf';
export { default as DMSansBold } from './DMSans-Bold.ttf';
export { default as GeistMonoRegular } from './GeistMono-Regular.ttf';

/**
 * Font family constants
 */
export const Fonts = {
  DMSans: {
    Regular: require('./DMSans-Regular.ttf'),
    Medium: require('./DMSans-Medium.ttf'),
    SemiBold: require('./DMSans-SemiBold.ttf'),
    Bold: require('./DMSans-Bold.ttf'),
  },
  GeistMono: {
    Regular: require('./GeistMono-Regular.ttf'),
  },
} as const;
