import type { StakeAccountCard } from '../../utils/staking';
import type { Testable } from './testable';

/**
 * The stake accounts detail (spec 038): a facts card per stake account, or
 * the loading, empty and error states (`stakeAccountsBlocks`). Read by the
 * DOM page; the mobile route builds the same blocks from the same hook.
 */
export interface StakeAccountsBodyPropsBase extends Testable {
  state: 'loading' | 'error' | 'empty' | 'ready';
  /** From `useStakeAccountsScreen`. */
  cards: StakeAccountCard[];
  onRetry: () => void;
}
