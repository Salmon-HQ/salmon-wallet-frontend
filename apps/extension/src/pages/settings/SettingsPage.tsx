/**
 * Settings — the page.
 *
 * The mobile twin is the route `app/(app)/settings/index.tsx`. Settings used
 * to be an overlay rendered inside Home's own tree, which meant only Home
 * could show it: opening it from Wallets set the flag on a component that was
 * not mounted, and nothing happened. It is a page of the app's stack now, so
 * every screen reaches it the same way, and leaving it returns to whichever
 * screen opened it.
 *
 * What belongs here is what belongs to Settings as a whole: the panel
 * registry (in `src/settings`), the row values the root list reads, the
 * analytics toggle, and the two removals that are asked over Settings rather
 * than under it — as mobile asks them with its own `Alert`.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  settingsRowValues,
  useAccountsContext,
  useAnalyticsConsent,
  useCurrencyContext,
  useLanguage,
  useTheme,
  useUserConfig,
  type SettingsPanelEntry,
} from '@salmon/shared';

import { ConfirmDialog, SettingsPanelStack } from '../../components';
import { useSettingsPanelRegistry } from '../../settings/panelRegistry';
import { clearSessionKey } from '../../utils/sessionKeyCache';

export interface SettingsPageProps {
  /** Leave Settings and return to the screen that opened it. */
  onClose: () => void;
  /** Panels to push straight away — Wallets opens Settings already deep. */
  initialPanels?: SettingsPanelEntry[];
}

export function SettingsPage({ onClose, initialPanels }: SettingsPageProps): React.ReactElement {
  const { t } = useTranslation();
  const [{ activeAccount, activeBlockchainAccount, networkId }, actions] = useAccountsContext();
  const [{ currency }] = useCurrencyContext();
  const { preference: appearancePreference } = useTheme();
  const { currentLanguage } = useLanguage();
  // Anonymous usage-analytics consent (opt-in). The first-run prompt lives in
  // onboarding; here we only bind the Settings toggle.
  const { consent: analyticsConsent, setConsent: setAnalyticsConsent } = useAnalyticsConsent();

  const { explorer } = useUserConfig({
    activeBlockchainAccount: {
      network: {
        environment: (activeBlockchainAccount
          ? networkId || 'solana-mainnet'
          : 'solana-mainnet') as 'solana-mainnet' | 'solana-devnet',
        blockchain: networkId?.split('-')[0] || 'solana',
      },
    },
  });

  const panelRegistry = useSettingsPanelRegistry();

  // What the four choosable rows currently read. Proper nouns and a currency
  // code — identical in both languages, so the list states the user's own
  // choice without inventing copy (mobile's `settings/index.tsx`).
  const rowValues = useMemo(
    () =>
      settingsRowValues({
        language: currentLanguage,
        currency,
        explorerName: explorer?.name,
        appearance: appearancePreference,
        appearanceLabels: {
          system: t('settings.appearance_options.system', 'System'),
          light: t('settings.appearance_options.light', 'Light'),
          dark: t('settings.appearance_options.dark', 'Dark'),
        },
      }),
    [currentLanguage, currency, explorer, appearancePreference, t]
  );

  // The two removals are confirmed over Settings, not by leaving it first:
  // backing out of the question has to land the user back on the row they
  // pressed (mobile raises its `Alert` on the settings screen for the same
  // reason).
  const [removeWalletDialogVisible, setRemoveWalletDialogVisible] = useState(false);
  const [removeAllWalletsDialogVisible, setRemoveAllWalletsDialogVisible] = useState(false);

  const validatePassword = useCallback(
    async (password: string): Promise<boolean> => actions.checkPassword(password),
    [actions]
  );

  const confirmRemoveWallet = useCallback(async () => {
    if (activeAccount?.id) {
      await actions.removeAccount(activeAccount.id);
    }
  }, [actions, activeAccount]);

  const confirmRemoveAllWallets = useCallback(async () => {
    await clearSessionKey();
    await actions.removeAllAccounts();
  }, [actions]);

  return (
    <>
      <SettingsPanelStack
        onClose={onClose}
        panelRegistry={panelRegistry}
        initialPanels={initialPanels}
        analyticsEnabled={analyticsConsent}
        onAnalyticsToggle={setAnalyticsConsent}
        onRemoveWallet={() => setRemoveWalletDialogVisible(true)}
        onRemoveAllWallets={() => setRemoveAllWalletsDialogVisible(true)}
        rowValues={rowValues}
      />

      <ConfirmDialog
        visible={removeWalletDialogVisible}
        onClose={() => setRemoveWalletDialogVisible(false)}
        title={t('settings.remove_wallet', 'Remove Wallet')}
        message={t(
          'settings.remove_wallet_description',
          'Are you sure you want to remove this wallet? Make sure you have backed up your recovery phrase before removing.'
        )}
        confirmText={t('actions.remove', 'Remove')}
        isDanger
        requirePassword
        validatePassword={validatePassword}
        onConfirm={confirmRemoveWallet}
      />

      <ConfirmDialog
        visible={removeAllWalletsDialogVisible}
        onClose={() => setRemoveAllWalletsDialogVisible(false)}
        title={t('settings.remove_all_wallets', 'Remove All Wallets')}
        message={t(
          'settings.remove_all_wallets_description',
          'This will remove ALL wallets from this device. This action cannot be undone. Make sure you have backed up all recovery phrases.'
        )}
        confirmText={t('actions.remove_all', 'Remove All')}
        isDanger
        onConfirm={confirmRemoveAllWallets}
      />
    </>
  );
}
