import type { TokenMarketDataPropsBase } from '@salmon/shared';

// `MarketData` lives in shared (`packages/shared/src/types/ui/token-market-data.ts`)
// so the extension's `packages/ui/TokenMarketData` stays on the same
// contract; re-exported here so mobile consumers (Home's Bitcoin column,
// `token/[id].tsx`) keep importing it from `TokenMarketData`.
export type { MarketData } from '@salmon/shared';

/** The "Market data" card — one contract with the DOM's `TokenMarketData`. */
export type TokenMarketDataProps = TokenMarketDataPropsBase;
