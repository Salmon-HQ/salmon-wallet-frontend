/**
 * The Settings screen's toggle handlers — identical on both platforms.
 * Flipping Developer Networks off while the session stands on devnet moves it
 * to the mainnet sibling first; unverified tokens writes straight through;
 * Bitcoin asks before it hides (spec 045 FR-012). Wraps `useDeveloperModeSettings` + the session's
 * `networkId`/`changeNetwork` (`useAccountsContext`) so both Settings twins
 * call one hook instead of re-deriving the same two callbacks.
 */
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAccountsContext } from '../contexts/AccountsContext';
import { useDeveloperModeSettings } from '../contexts/DeveloperModeContext';
import type { ConfirmSheetPropsBase } from '../types/ui/settings-panels';

export interface UseDeveloperModeTogglesResult {
  developerNetworks: boolean;
  showUnverifiedTokens: boolean;
  handleToggleDeveloperNetworks: () => void;
  handleToggleUnverifiedTokens: (show: boolean) => void;
  bitcoinEnabled: boolean;
  /** On writes at once; off opens `bitcoinConfirm` and writes only on confirm. */
  handleToggleBitcoin: (next: boolean) => void;
  /** Ready to spread into `ConfirmSheet` / `ConfirmDialog`. */
  bitcoinConfirm: ConfirmSheetPropsBase;
}

export function useDeveloperModeToggles(): UseDeveloperModeTogglesResult {
  const [{ networkId }, accountActions] = useAccountsContext();
  const {
    developerNetworks,
    showUnverifiedTokens,
    toggleDeveloperNetworks,
    setShowUnverifiedTokens,
    bitcoinEnabled,
    setBitcoinEnabled,
  } = useDeveloperModeSettings();
  const { t } = useTranslation();
  const [confirmingBitcoinOff, setConfirmingBitcoinOff] = useState(false);

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

  const handleToggleBitcoin = useCallback(
    (next: boolean) => {
      if (next) void setBitcoinEnabled(true);
      else setConfirmingBitcoinOff(true);
    },
    [setBitcoinEnabled]
  );

  const bitcoinConfirm: ConfirmSheetPropsBase = {
    visible: confirmingBitcoinOff,
    onClose: () => setConfirmingBitcoinOff(false),
    onConfirm: async () => {
      const stored = await setBitcoinEnabled(false, {
        activeNetworkId: networkId,
        changeNetwork: accountActions.changeNetwork,
      });
      // Throwing keeps the sheet open on `errorText`.
      if (!stored) throw new Error('The Bitcoin choice was not stored');
      setConfirmingBitcoinOff(false);
    },
    errorText: t('errors.save_failed'),
    title: t('settings.bitcoin_off_title'),
    message: t('settings.bitcoin_off_message'),
    confirmText: t('settings.bitcoin_off_confirm'),
  };

  return {
    developerNetworks,
    showUnverifiedTokens,
    handleToggleDeveloperNetworks,
    handleToggleUnverifiedTokens,
    bitcoinEnabled,
    handleToggleBitcoin,
    bitcoinConfirm,
  };
}
