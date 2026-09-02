/**
 * DeveloperModeContext — the user's two "show me more" settings, read once.
 *
 * The provider mounts on the `(app)` stack, not inside the tabs: Activity,
 * Send, NFT detail and Powerups are pushed screens that sit ABOVE the tabs
 * layout, so a provider mounted there left every one of them reading the
 * context's default `false` instead of the stored flag. One `useUserConfig`
 * instance feeds it, so the settings panel registry and the Settings screen
 * read the same value the carousel does.
 *
 * Two settings, not one: Developer Networks decides which networks are
 * *offered*; unverified tokens decide what a list *shows*. They used to be the
 * same boolean (spec 026 D4).
 */
import React, { createContext, useContext, useMemo } from 'react';

import {
  useAccountsContext,
  useUserConfig,
  type ToggleDeveloperNetworksOptions,
} from '@salmon/shared';

import { useEnsureMirrorNetworks } from '../../hooks/useEnsureMirrorNetworks';

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

  // A wallet made before mirrors were derived at creation holds only the
  // mainnet half. Offering it a devnet page it has no address for would drop
  // the page silently, so the addresses are completed the first time the flag
  // asks for them.
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
