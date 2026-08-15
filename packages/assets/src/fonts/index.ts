/**
 * Font assets for Salmon Wallet
 *
 * DM Sans - Primary font family
 */

// DM Sans font family
export { default as DMSansBlack } from './DMSans-Black.ttf';
export { default as DMSansBold } from './DMSans-Bold.ttf';
export { default as DMSansExtraBold } from './DMSans-ExtraBold.ttf';
export { default as DMSansLight } from './DMSans-Light.ttf';
export { default as DMSansMedium } from './DMSans-Medium.ttf';
export { default as DMSansRegular } from './DMSans-Regular.ttf';
export { default as DMSansSemiBold } from './DMSans-SemiBold.ttf';

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
  /** @deprecated superseded by Geist; retained until its consumers are cleared */
  DMSans: {
    Black: require('./DMSans-Black.ttf'),
    Bold: require('./DMSans-Bold.ttf'),
    ExtraBold: require('./DMSans-ExtraBold.ttf'),
    Light: require('./DMSans-Light.ttf'),
    Medium: require('./DMSans-Medium.ttf'),
    Regular: require('./DMSans-Regular.ttf'),
    SemiBold: require('./DMSans-SemiBold.ttf'),
  },
} as const;
