// `MarketData` lives in shared (`packages/shared/src/types/ui/token-market-data.ts`)
// so web/extension's own `packages/ui/TokenMarketData` stays on the same
// contract; re-exported here so mobile consumers (Home's Bitcoin column,
// `token/[id].tsx`) keep importing it from `TokenDetail`.
export type { MarketData } from '@salmon/shared';
