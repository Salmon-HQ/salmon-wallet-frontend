/**
 * DeveloperModeContext — the user's two "show me more" settings, read once.
 *
 * The provider mounts on the unlocked session, above every screen: mobile's
 * `(app)` stack, the extension's side panel root. One `useUserConfig`
 * instance feeds it, so the settings rows and the carousel read the same
 * value; mounted lower, the pushed screens read the context default instead
 * of the stored flag.
 *
 * Two settings, not one: Developer Networks decides which networks are
 * *offered*; unverified tokens decide what a list *shows*. They used to be the
 * same boolean (spec 026 D4).
 *
 * Mounting it also completes an older wallet's mirror addresses the first
 * time the flag asks for them (`useEnsureMirrorNetworks`) — on both platforms,
 * so a devnet page is never offered to a wallet that has no devnet account.
 */
import React, { createContext, useContext, useMemo } from 'react';

import { useEnsureMirrorNetworks } from '../hooks/useEnsureMirrorNetworks';
import { useUserConfig, type ToggleDeveloperNetworksOptions } from '../hooks/useUserConfig';
import { useAccountsContext } from './AccountsContext';

export interface DeveloperModeContextValue {
  developerNetworks: boolean;
  showUnverifiedTokens: boolean;
  toggleDeveloperNetworks: (options?: ToggleDeveloperNetworksOptions) => Promise<void>;
  setShowUnverifiedTokens: (show: boolean) => Promise<void>;
}

const noop = async () => {};

const DeveloperModeContext = createContext<DeveloperModeContextValue>({
  developerNetworks: false,
  showUnverifiedTokens: false,
  toggleDeveloperNetworks: noop,
  setShowUnverifiedTokens: noop,
});

export function DeveloperModeProvider({ children }: { children: React.ReactNode }) {
  const [accountState] = useAccountsContext();
  const { activeBlockchainAccount, networkId } = accountState;

  // `useUserConfig` keys the explorer choice off this shape; the network half
  // is all it reads.
  const userConfigAccount = useMemo(
    () => ({
      network: {
        environment: (activeBlockchainAccount
          ? networkId || 'solana-mainnet'
          : 'solana-mainnet') as 'solana-mainnet' | 'solana-devnet',
        blockchain: 'solana',
      },
    }),
    [activeBlockchainAccount, networkId]
  );

  const {
    developerNetworks,
    toggleDeveloperNetworks,
    showUnverifiedTokens,
    setShowUnverifiedTokens,
  } = useUserConfig({ activeBlockchainAccount: userConfigAccount });

  useEnsureMirrorNetworks(developerNetworks);

  const value = useMemo<DeveloperModeContextValue>(
    () => ({
      developerNetworks,
      showUnverifiedTokens,
      toggleDeveloperNetworks,
      setShowUnverifiedTokens,
    }),
    [developerNetworks, showUnverifiedTokens, toggleDeveloperNetworks, setShowUnverifiedTokens]
  );

  return <DeveloperModeContext.Provider value={value}>{children}</DeveloperModeContext.Provider>;
}

/** Whether testnet and devnet networks are offered. */
export function useDeveloperMode(): boolean {
  return useContext(DeveloperModeContext).developerNetworks;
}

/** Whether unverified (spam-flagged) tokens and collectibles are shown. */
export function useUnverifiedTokens(): boolean {
  return useContext(DeveloperModeContext).showUnverifiedTokens;
}

/** The whole slice, for the Settings rows that write it. */
export function useDeveloperModeSettings(): DeveloperModeContextValue {
  return useContext(DeveloperModeContext);
}
