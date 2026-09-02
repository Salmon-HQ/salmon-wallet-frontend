/**
 * SendFlowContext — the four send screens' shared state.
 *
 * Send used to be one mounted sheet holding its own step, token, recipient and
 * amount in local state. As four stack screens each of those screens mounts
 * and unmounts on its own, so the state that survives a back gesture has to
 * live above them: the provider is mounted once at `app/(app)/send/_layout`,
 * which stays mounted for the whole flow.
 *
 * The state itself is `useSendFlowState` from `@salmon/shared` — the same
 * hook the DOM's `SendPage` calls directly. This provider adds only what the
 * routes cannot pass as params: the active account and network, the token
 * list (the same React Query cache Home populated) and the unverified-tokens
 * preference.
 */
import React, { createContext, useContext, useMemo } from 'react';
import {
  getBlockchainFromNetworkId,
  useAccountsContext,
  useBalance,
  useSendFlowState,
  type BlockchainAccount,
  type BlockchainType,
  type NetworkId,
  type SendFlowState,
  type SendRecipient,
  type SendToken,
} from '@salmon/shared';

import { useUnverifiedTokens } from './DeveloperModeContext';

export type { SendRecipient };

export interface SendFlowValue extends SendFlowState {
  /** The chain the flow runs on — Home's active chain, read once per render. */
  blockchain: BlockchainType;
  /** The active network, for the queries a screen runs of its own. */
  networkId: NetworkId | null;
  account: BlockchainAccount | undefined;
  tokens: SendToken[];
  tokensLoading: boolean;
  showUnverifiedTokens: boolean;
}

const SendFlowContext = createContext<SendFlowValue | null>(null);

export function SendFlowProvider({ children }: { children: React.ReactNode }) {
  const [accountState] = useAccountsContext();
  const { ready, activeBlockchainAccount, networkId } = accountState;
  const showUnverifiedTokens = useUnverifiedTokens();

  const blockchain = getBlockchainFromNetworkId(networkId ?? 'solana-mainnet');

  // The same query Home already populated: `useBalance` is React Query backed
  // and keyed on account + network, so this reads the cache rather than firing
  // a second request for the list the user was just looking at.
  const { tokens, loading: tokensLoading } = useBalance({
    account: activeBlockchainAccount,
    networkId: (networkId ?? undefined) as NetworkId | undefined,
    skip: !ready || !activeBlockchainAccount,
    includeSpam: showUnverifiedTokens,
  });

  const flow = useSendFlowState({
    account: activeBlockchainAccount as BlockchainAccount,
    blockchain,
    tokens: tokens as SendToken[],
  });

  const value = useMemo<SendFlowValue>(
    () => ({
      ...flow,
      blockchain,
      networkId: (networkId ?? null) as NetworkId | null,
      account: activeBlockchainAccount,
      tokens: tokens as SendToken[],
      tokensLoading,
      showUnverifiedTokens,
    }),
    [
      flow,
      blockchain,
      networkId,
      activeBlockchainAccount,
      tokens,
      tokensLoading,
      showUnverifiedTokens,
    ]
  );

  return <SendFlowContext.Provider value={value}>{children}</SendFlowContext.Provider>;
}

/**
 * The flow's state, from any of the four screens.
 *
 * Throws outside the provider rather than handing back a null-ish default: a
 * send screen with no flow behind it has nothing to send.
 */
export function useSendFlow(): SendFlowValue {
  const value = useContext(SendFlowContext);
  if (!value) throw new Error('useSendFlow must be used inside SendFlowProvider');
  return value;
}

export default SendFlowContext;
