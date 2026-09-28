/**
 * Mints the wallet names by hand rather than resolving from the live token
 * list, because a lookup by symbol would accept any token that calls itself
 * "USDC". The pair is the one Salmon Pay's `lib/config.ts` uses.
 */
import type { SolanaNetworkId } from '../../types/blockchain';

/** Circle's USDC mint per cluster. */
export const USDC_MINT_BY_NETWORK: Readonly<Record<SolanaNetworkId, string>> = {
  'solana-mainnet': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'solana-devnet': '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
};

/** USDC has six decimals on every cluster. */
export const USDC_DECIMALS = 6;
