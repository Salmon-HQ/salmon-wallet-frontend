/**
 * The balance block's pagination cues: which chain a swipe backward or
 * forward reaches from the active page. One derivation for both platforms;
 * the ink is resolved at render from `chain.hintInk[blockchain]`.
 */
import type { BlockchainBalance } from '../types/ui/balance-card';
import { NETWORK_DISPLAY } from './networkDisplay';

export interface BalanceCue {
  /** The page the cue leads to. */
  index: number;
  /** The chain's ticker, e.g. `SOL`. */
  symbol: string;
  /** The key into `chain.hintInk`. */
  blockchain: BlockchainBalance['network']['blockchain'];
}

export interface BalanceCues {
  previous?: BalanceCue;
  next?: BalanceCue;
}

const cueAt = (
  blockchains: readonly Pick<BlockchainBalance, 'network'>[],
  index: number
): BalanceCue | undefined => {
  const chainBalance = blockchains[index];
  const symbol = chainBalance && NETWORK_DISPLAY[chainBalance.network.id]?.symbol;
  return symbol ? { index, symbol, blockchain: chainBalance.network.blockchain } : undefined;
};

/** The cues for `activeIndex`: none on a single chain, one at either end. */
export function balanceCues(
  blockchains: readonly Pick<BlockchainBalance, 'network'>[],
  activeIndex: number
): BalanceCues {
  return {
    previous: cueAt(blockchains, activeIndex - 1),
    next: cueAt(blockchains, activeIndex + 1),
  };
}
