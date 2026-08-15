/**
 * Font assets for Salmon Wallet
 *
 * Geist - Primary font family
 */

// Geist — current interface family (four weights; see theme/typography.ts)
export { default as GeistRegular } from './Geist-Regular.ttf';
export { default as GeistMedium } from './Geist-Medium.ttf';
export { default as GeistSemiBold } from './Geist-SemiBold.ttf';
export { default as GeistBold } from './Geist-Bold.ttf';
export { default as GeistMonoRegular } from './GeistMono-Regular.ttf';

/**
 * Font family constants
 */
export const Fonts = {
  Geist: {
    Regular: require('./Geist-Regular.ttf'),
    Medium: require('./Geist-Medium.ttf'),
    SemiBold: require('./Geist-SemiBold.ttf'),
    Bold: require('./Geist-Bold.ttf'),
  },
  GeistMono: {
    Regular: require('./GeistMono-Regular.ttf'),
  },
} as const;
