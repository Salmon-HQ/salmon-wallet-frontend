/**
 * The real `@salmon/shared`, with the listed exports replaced.
 *
 * A test that lists by hand every export its screen reads breaks the day the
 * screen starts reading one more — including the day logic moves from the
 * screen into a shared hook. Starting from the real package, a test names only
 * what it needs to control:
 *
 *   jest.mock('@salmon/shared', () =>
 *     require('../test-utils/sharedWith').sharedWith({
 *       useSolanaNfts: () => mockNfts(),
 *     })
 *   );
 *
 * `require` inside the factory, because Jest hoists `jest.mock` above imports.
 */
export function sharedWith(overrides: Record<string, unknown>): Record<string, unknown> {
  return { ...jest.requireActual<Record<string, unknown>>('@salmon/shared'), ...overrides };
}
