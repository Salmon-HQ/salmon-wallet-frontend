import type { BlockchainId } from '../types/ui/balance-card';
import type { PriceChartPeriod } from '../types/ui';
import type { CoinInfo } from '../types/price';
import type { MarketData } from '../types/ui/token-market-data';

/**
 * Map BlockchainId to CoinGecko coin ID for price data.
 * Devnets/testnets map to their mainnet counterparts.
 */
export const BLOCKCHAIN_TO_COINGECKO: Record<BlockchainId, string> = {
  solana: 'solana',
  'solana-devnet': 'solana',
  bitcoin: 'bitcoin',
  'bitcoin-testnet': 'bitcoin',
  ethereum: 'ethereum',
  'ethereum-sepolia': 'ethereum',
};

/**
 * Map chart period to CoinGecko `days` parameter.
 * CoinGecko Free Tier limits: max 365 days.
 */
export const PERIOD_TO_DAYS: Record<PriceChartPeriod, 1 | 7 | 30 | 90 | 365> = {
  '1H': 1,
  '1D': 1,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
};

/**
 * Transform a CoinInfo's nested marketData into the flat MarketData shape
 * expected by UI components (TokenMarketData, TokenDetailPage, etc.).
 */
export function coinInfoToMarketData(coinInfo: CoinInfo): MarketData | undefined {
  if (!coinInfo?.marketData) return undefined;
  const md = coinInfo.marketData;
  return {
    currentPrice: md.currentPrice,
    marketCap: md.marketCap,
    marketCapRank: md.marketCapRank,
    volume24h: md.totalVolume,
    high24h: md.high24h,
    low24h: md.low24h,
    circulatingSupply: md.circulatingSupply,
    totalSupply: md.totalSupply,
    maxSupply: md.maxSupply,
    ath: md.ath,
    athChangePercentage: md.athChangePercentage,
    athDate: md.athDate,
    atl: md.atl,
    atlChangePercentage: md.atlChangePercentage,
    atlDate: md.atlDate,
  };
}
