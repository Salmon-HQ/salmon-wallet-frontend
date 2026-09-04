/**
 * ChainSelector — the balance block's chain switcher.
 *
 * Sits where the "Total balance" label used to. Both platforms build on
 * `UnderlineTabs` — the one selection language for lateral choices
 * (DESIGN.md §Navigation), the same component the Portfolio | NFTs row below
 * builds on — one tab per chain the wallet holds, reading `NETWORK_DISPLAY`'s
 * own name ("Solana", "Solana Devnet"). The one difference from every other
 * `UnderlineTabs` consumer: each tab's underline carries that chain's own hue
 * rather than the shared accent. Nothing renders when there is only one
 * chain and it is mainnet — nothing to name, nothing to switch to.
 *
 * The swipe gesture on the amount (`BalanceHeader`'s own `panGesture`) keeps
 * working exactly as it did; picking a tab here is an alternate route to the
 * same `onSelect`, not a replacement.
 */
import React from 'react';
import { type BlockchainBalance, getChainSelectorTabs } from '@salmon/shared';

import { useSemantic } from '../../theme/useThemedStyles';
import { UnderlineTabs } from '../UnderlineTabs';

interface ChainSelectorProps {
  blockchains: BlockchainBalance[];
  activeIndex: number;
  onSelect: (index: number) => void;
  testID?: string;
}

export const ChainSelector: React.FC<ChainSelectorProps> = ({
  blockchains,
  activeIndex,
  onSelect,
  testID = 'balance-chain-selector',
}) => {
  const { chain } = useSemantic();
  const state = getChainSelectorTabs(blockchains, activeIndex, onSelect, chain.hintInk);
  if (!state) return null;

  return (
    <UnderlineTabs
      testID={testID}
      tabs={state.tabs}
      activeKey={state.activeKey}
      onChange={state.onChange}
      size="md"
      tabTestIDPrefix={`${testID}-option`}
      underlineTestID={`${testID}-underline`}
    />
  );
};

export default ChainSelector;
