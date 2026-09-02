import type { Testable } from './testable';

/**
 * The NFTs sub-tab of Home: one grid of the collectibles held on the active
 * network (spec 026 D1), with the load-failure, partial-load and empty answers
 * above it and the tile skeletons while it loads.
 *
 * The tab reads the active account and network from context on both
 * platforms; what each host adds is its own scroll plumbing (RN scroll props
 * on mobile, a DOM scroll handler and content padding on the side panel),
 * which is why the cross-platform contract carries only the test label.
 */
export interface NftsTabPropsBase extends Testable {}
