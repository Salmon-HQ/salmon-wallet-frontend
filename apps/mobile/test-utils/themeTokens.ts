/**
 * The design tokens with identity scalers, to spread into a `sharedWith`
 * mock of `@salmon/shared` (`test-utils/sharedWith.ts`).
 *
 * The tokens are the real ones. Only the scalers below differ from the
 * package, so a style value in an assertion equals the token it came from.
 */
export * from '../../../packages/shared/src/theme';

/**
 * The responsive scalers, as identities.
 *
 * `s`/`vs`/`ms` sit beside the tokens in every component style block, so a
 * mock carrying the theme but not the scalers dies at the first
 * `padding: s(...)` with "is not a function" — an error that says nothing
 * about the component under test. They are identities rather than the real
 * implementations because the real ones read `Dimensions` from React Native,
 * and importing them here resolves a second copy of RN out of
 * `packages/shared/node_modules` that has no bridge. Identity also makes an
 * assertion readable: a style value equals the token it came from.
 */
const scale = (size: number): number => size;
export const s = scale;
const verticalScale = (size: number): number => size;
export const vs = verticalScale;
const moderateScale = (size: number): number => size;
export const ms = moderateScale;
const moderateVerticalScale = (size: number): number => size;
export const mvs = moderateVerticalScale;
