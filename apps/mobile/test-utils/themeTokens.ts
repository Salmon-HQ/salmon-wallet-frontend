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
