import type { TokenAboutPropsBase, TokenMarketDataPropsBase } from '@salmon/shared';

// `MarketData` lives in shared (`packages/shared/src/types/ui/token-market-data.ts`)
// so the extension's `packages/ui/TokenMarketData` stays on the same
// contract; re-exported here so mobile consumers (Home's Bitcoin column,
// `token/[id].tsx`) keep importing it from `TokenDetail`.
export type { MarketData } from '@salmon/shared';

/** The "About" card — one contract with the DOM's `TokenAbout`. */
export type AboutCardProps = TokenAboutPropsBase;

/** The "Market data" card — one contract with the DOM's `TokenMarketData`. */
export type MarketDataCardProps = TokenMarketDataPropsBase;
