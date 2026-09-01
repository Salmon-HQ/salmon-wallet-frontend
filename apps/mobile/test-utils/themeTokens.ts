/**
 * The real design tokens, for Jest mocks of `@salmon/shared`.
 *
 * Screen tests mock the whole barrel because importing it for real drags in
 * `@solana/kit`, which jest-expo will not transform. Hand-listing the handful
 * of tokens a screen happens to read is how those mocks used to work, and it
 * meant every token a component started reading broke an unrelated test with
 * "cannot read properties of undefined". The theme folder imports nothing but
 * itself, so it can be pulled in directly.
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
export const scale = (size: number): number => size;
export const s = scale;
export const verticalScale = (size: number): number => size;
export const vs = verticalScale;
export const moderateScale = (size: number): number => size;
export const ms = moderateScale;
export const moderateVerticalScale = (size: number): number => size;
export const mvs = moderateVerticalScale;
