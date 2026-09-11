/**
 * The Settings screen's two "show me more" toggle handlers — identical on
 * both platforms. Flipping Developer Networks off while the session stands
 * on devnet moves it to the mainnet sibling first; unverified tokens writes
 * straight through. Wraps `useDeveloperModeSettings` + the session's
 * `networkId`/`changeNetwork` (`useAccountsContext`) so both Settings twins
 * call one hook instead of re-deriving the same two callbacks.
 */
import { useCallback } from 'react';

import { useAccountsContext } from '../contexts/AccountsContext';
import { useDeveloperModeSettings } from '../contexts/DeveloperModeContext';

export interface UseDeveloperModeTogglesResult {
  developerNetworks: boolean;
  showUnverifiedTokens: boolean;
  handleToggleDeveloperNetworks: () => void;
  handleToggleUnverifiedTokens: (show: boolean) => void;
}

export function useDeveloperModeToggles(): UseDeveloperModeTogglesResult {
  const [{ networkId }, accountActions] = useAccountsContext();
  const {
    developerNetworks,
    showUnverifiedTokens,
    toggleDeveloperNetworks,
    setShowUnverifiedTokens,
  } = useDeveloperModeSettings();

  const handleToggleDeveloperNetworks = useCallback(() => {
    void toggleDeveloperNetworks({
      activeNetworkId: networkId,
      changeNetwork: accountActions.changeNetwork,
    });
  }, [toggleDeveloperNetworks, networkId, accountActions]);

  const handleToggleUnverifiedTokens = useCallback(
    (show: boolean) => {
      void setShowUnverifiedTokens(show);
    },
    [setShowUnverifiedTokens]
  );

  return {
    developerNetworks,
    showUnverifiedTokens,
    handleToggleDeveloperNetworks,
    handleToggleUnverifiedTokens,
  };
}
