import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { BlurTargetView } from 'expo-blur';
import { Tabs, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';

import {
  useAccountsContext,
  useUserConfig,
  useAnalyticsConsent,
  useAvailableNetworks,
  useCurrencyContext,
  useAddressbook,
  AddressbookError,
  useOpenLink,
  buildNetworkListFromAccount,
  SUPPORTED_CURRENCIES,
  CURRENCY_MAP,
  SUPPORT_OPTIONS,
  LANGUAGE_NAMES,
  colors,
  semantic,
  getStashItem,
  type SettingsPanelEntry,
  type AddressBookItem,
  type AddressInput,
  type CurrencyCode,
  type LanguageCode,
  type ExplorerSelectorItem,
  type NetworkSelectorItem,
  type TrustedAppItem,
  type LanguageSelectorItem,
  type CurrencySelectorItem,
  type NetworkAdapter,
  type BlockchainType,
} from '@salmon/shared';
import {
  DepthBackground,
  ScalesBackground,
  GlassTabBar,
  SettingsSheet,
  WalletSwitcherSheet,
  LanguageSelector,
  CurrencySelector,
  ExplorerSelector,
  NetworkSelector,
  TrustedAppsSelector,
  SupportSelector,
  AddressBookPanel,
  AddressAddPanel,
  AddressEditPanel,
  AccountAvatarPanel,
  AccountsPanel,
  AccountEditPanel,
  AccountNamePanel,
  AccountAddPanel,
  SecurityPanel,
  PrivateKeyPanel,
  BackupPanel,
  AboutPanel,
  type MobilePanelRegistry,
  BlurTargetProvider,
} from '../../../src/components';
import { useLanguage } from '../../../src/i18n';
import { useBiometricAuth } from '../../../hooks/useBiometricAuth';
import { DeveloperModeProvider } from '../../../src/contexts/DeveloperModeContext';
import { TaskChromeProvider } from '../../../src/contexts/TaskChromeContext';
import { GateContainer } from '../../../src/components/GateContainer';
import { PanelHost } from '../../../src/components/PanelHost';
import type { SettingsScreen } from '@salmon/shared';
import {
  SCREEN_TITLE_KEYS,
  DYNAMIC_HEADER_SCREENS,
} from '../../../src/components/SettingsSheet/SettingsSheet';
import { LockContent } from '../../../src/components/GateContainer/LockContent';
import { HeaderContent } from '../../../src/components/GateContainer/HeaderContent';
import type { DerivedKeyCache } from '@salmon/shared';
import type { GateState, GateExpandedHeader } from '../../../src/components/GateContainer/types';
import { useTabChrome } from '../../../hooks/useTabChrome';
import { FLOAT_DELAY_MS } from '../../../src/utils/sinkAndFloat';
import { DEBUG_LAYER_COLORS, DEBUG_LAYER_COLOR } from '../../../src/debug/layerColors';

/**
 * Tab Layout for Salmon Wallet
 *
 * Renders shared chrome (header, background, gradient, sheets) once for all tabs.
 * Individual tab screens only render their own content.
 */
export default function TabLayout() {
  const router = useRouter();
  const { t } = useTranslation();
  const { topInset } = useTabChrome();
  const openLink = useOpenLink();
  const blurTargetRef = useRef<View>(null);

  // Shared UI state
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settingsInitialPanels, setSettingsInitialPanels] = useState<
    SettingsPanelEntry[] | undefined
  >(undefined);
  const [walletSwitcherVisible, setWalletSwitcherVisible] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<AddressBookItem | null>(null);

  // Gate expanded header state (reported by SettingsSheet)
  const [settingsHeaderTitle, setSettingsHeaderTitle] = useState(() =>
    t('settings.title', 'Settings')
  );
  const [settingsHeaderBack, setSettingsHeaderBack] = useState<(() => void) | undefined>(undefined);
  const [walletsHeaderTitle, setWalletsHeaderTitle] = useState(() =>
    t('settings.wallets.your_wallets')
  );
  const [walletsHeaderBack, setWalletsHeaderBack] = useState<(() => void) | undefined>(undefined);

  // Account context
  const [accountState, accountActions] = useAccountsContext();
  const {
    accounts,
    accountId,
    activeAccount,
    activeBlockchainAccount,
    networkId,
    activeTrustedApps,
  } = accountState;

  // User configuration
  const userConfigAccount = activeBlockchainAccount
    ? {
        network: {
          environment: (networkId || 'solana-mainnet') as 'solana-mainnet' | 'solana-devnet',
          blockchain: 'solana',
        },
      }
    : {
        network: {
          environment: 'solana-mainnet' as const,
          blockchain: 'solana',
        },
      };
  const {
    developerNetworks,
    toggleDeveloperNetworks,
    explorer,
    explorers,
    changeExplorer,
    isLoading: explorerLoading,
  } = useUserConfig({
    activeBlockchainAccount: userConfigAccount,
  });

  // Anonymous usage-analytics consent (opt-in). The first-run prompt now lives
  // in onboarding (analytics-consent screen); here we only bind the Settings toggle.
  const { consent: analyticsConsent, setConsent: setAnalyticsConsent } = useAnalyticsConsent();

  // Language
  const { currentLanguage, availableLanguages, changeLanguage } = useLanguage();

  // Currency
  const [{ currency }, { changeCurrency }] = useCurrencyContext();

  // Available networks
  const { allNetworks } = useAvailableNetworks({
    activeBlockchainAccount: userConfigAccount,
    developerNetworks,
  });

  // Address book
  const networkAdapter: NetworkAdapter = useMemo(
    () => ({
      getNetwork: async (id: string) => {
        const found = allNetworks.find((n) => n.id === id);
        if (!found) return undefined;
        return {
          id: found.id,
          name: found.name,
          blockchain: found.id.split('-')[0] as BlockchainType,
        };
      },
      getNetworks: async () =>
        allNetworks.map((n) => ({
          id: n.id,
          name: n.name,
          blockchain: n.id.split('-')[0] as BlockchainType,
        })),
    }),
    [allNetworks]
  );
  const [
    { contacts, isLoading: addressBookLoading, error: addressBookError },
    { addContact, editContact: editAddressBookContact, removeContact, reload: reloadAddressBook },
  ] = useAddressbook({ networkAdapter });

  /** Surfaces a classified address-book write failure per house alert style. */
  const showAddressBookWriteError = useCallback(
    (err: unknown, fallbackKey = 'settings.addressbook.save_failed') => {
      const key =
        err instanceof AddressbookError && err.kind === 'resolve'
          ? 'settings.addressbook.resolve_failed'
          : fallbackKey;
      Alert.alert(t('general.error'), t(key));
    },
    [t]
  );

  // Biometric auth (for security and private key screens)
  const {
    state: biometricState,
    enableBiometric,
    setEnableBiometric,
    authenticateWithBiometric,
    storeKeyForBiometric,
    clearBiometricKey,
    refreshState: refreshBiometricState,
  } = useBiometricAuth();

  // Locking discards any open panel. `locked` already wins over them in
  // `gateState`, but leaving the flags set means SettingsSheet keeps its panel
  // stack across the lock and unlock drops the user back into whatever screen
  // was open (Private Key, Backup Seed Phrase) instead of the wallet.
  useEffect(() => {
    if (!accountState.locked) return;
    setSettingsVisible(false);
    setSettingsInitialPanels(undefined);
    setWalletSwitcherVisible(false);
  }, [accountState.locked]);

  // The parked gate release. A password unlock flips `locked` the instant the
  // crypto resolves, and the gate leaving 'locked' unmounts LockContent — and
  // with it the unlock wait, cutting its wave mid-crossing. The hold keeps the
  // gate rendered as locked until LockContent reports the wave has left the
  // screen (`onUnlockExited`, watchdog-backed), the same parked pattern the
  // password screen uses for its route.
  const [unlockHeld, setUnlockHeld] = useState(false);
  const isReduceMotionEnabled = useReducedMotion();
  const unlockReleaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (unlockReleaseTimer.current !== null) clearTimeout(unlockReleaseTimer.current);
    },
    []
  );

  // Compute gate state
  const gateState: GateState =
    accountState.locked || unlockHeld
      ? 'locked'
      : settingsVisible
        ? 'settings'
        : walletSwitcherVisible
          ? 'wallets'
          : 'collapsed';

  // Lock handlers (moved from root _layout.tsx)
  const handleLockUnlock = useCallback(
    async (password: string): Promise<boolean> => {
      // Held *before* the await: `locked` flips inside unlockAccounts, in an
      // earlier microtask than any state set after it, so holding afterwards
      // leaves one frame where the gate collapses and the wait unmounts.
      setUnlockHeld(true);
      try {
        const success = await accountActions.unlockAccounts(password);
        if (!success) setUnlockHeld(false);
        return success;
      } catch (err) {
        console.error('Unlock failed:', err);
        setUnlockHeld(false);
        return false;
      }
    },
    [accountActions]
  );

  // The unlock passage is sequential: hold → the wait's sink (`onUnlockExited`
  // fires as it completes) → one beat of calm water → the gate's rise. The
  // beat is `FLOAT_DELAY_MS`, the same pause every sink in this water earns
  // before what follows it moves. Under reduce motion the whole passage is a
  // cut, so the release is immediate.
  const handleUnlockExited = useCallback(() => {
    if (isReduceMotionEnabled) {
      setUnlockHeld(false);
      return;
    }
    if (unlockReleaseTimer.current !== null) clearTimeout(unlockReleaseTimer.current);
    unlockReleaseTimer.current = setTimeout(() => {
      unlockReleaseTimer.current = null;
      setUnlockHeld(false);
    }, FLOAT_DELAY_MS);
  }, [isReduceMotionEnabled]);

  const handleLockUnlockWithKey = useCallback(
    async (keyJson: string): Promise<boolean> => {
      // Parked like the password path: `locked` flips inside
      // unlockWithCachedKey, in an earlier microtask than the awaited return,
      // and an unparked gate starts rising while LockContent is still
      // settling — a cut. There is no wave here (the key is fast), so on
      // success the release is immediate and the gate rises through its own
      // choreography instead of mid-commit.
      setUnlockHeld(true);
      try {
        const keyCache: DerivedKeyCache = JSON.parse(keyJson);
        const success = await accountActions.unlockWithCachedKey(keyCache);
        setUnlockHeld(false);
        return success;
      } catch (error) {
        console.error('Biometric unlock failed:', error);
        setUnlockHeld(false);
        return false;
      }
    },
    [accountActions]
  );

  const handleGetDerivedKey = useCallback(async (): Promise<string | null> => {
    try {
      const keyCache = await getStashItem<DerivedKeyCache>('derived_key_cache');
      return keyCache ? JSON.stringify(keyCache) : null;
    } catch {
      return null;
    }
  }, []);

  const handleRemoveAllAccountsFromLock = useCallback(async () => {
    await setEnableBiometric(false);
    await accountActions.removeAllAccounts();
    router.replace('/(auth)');
  }, [accountActions, router, setEnableBiometric]);

  // Biometric config for LockContent
  const lockBiometricConfig = useMemo(
    () => ({
      state: biometricState,
      authenticateWithBiometric,
      storeKeyForBiometric,
      enableBiometric,
      refreshState: refreshBiometricState,
    }),
    [
      biometricState,
      authenticateWithBiometric,
      storeKeyForBiometric,
      enableBiometric,
      refreshBiometricState,
    ]
  );

  // Settings header change handler
  const resolvePanelTitle = useCallback(
    (screen: SettingsScreen) => t(SCREEN_TITLE_KEYS[screen] || 'settings.title'),
    [t]
  );

  const handleWalletsHeaderChange = useCallback(
    (title: string, onBack: (() => void) | undefined) => {
      setWalletsHeaderTitle(title);
      setWalletsHeaderBack(() => onBack);
    },
    []
  );

  const handleSettingsHeaderChange = useCallback(
    (title: string, onBack: (() => void) | undefined) => {
      setSettingsHeaderTitle(title);
      setSettingsHeaderBack(() => onBack);
    },
    []
  );

  // Gate expanded header
  const expandedHeader: GateExpandedHeader | undefined = useMemo(() => {
    if (gateState === 'settings') {
      return {
        title: settingsHeaderTitle,
        onBack: settingsHeaderBack || null,
        onClose: () => {
          setSettingsVisible(false);
          setSettingsInitialPanels(undefined);
        },
      };
    }
    if (gateState === 'wallets') {
      // The switcher hosts account panels of its own now, so its chrome
      // follows the panel stack the same way settings does — a title that
      // tracks the open panel, and a back that pops it.
      return {
        title: walletsHeaderTitle,
        onBack: walletsHeaderBack || null,
        onClose: () => setWalletSwitcherVisible(false),
      };
    }
    return undefined;
  }, [
    gateState,
    settingsHeaderTitle,
    settingsHeaderBack,
    walletsHeaderTitle,
    walletsHeaderBack,
    t,
  ]);

  // Derived values
  const accountName = activeAccount?.name || t('wallet.unnamed_account', 'Account');
  const address = activeBlockchainAccount?.getReceiveAddress() || '';

  // Address book items
  const addressBookItems: AddressBookItem[] = useMemo(
    () =>
      contacts.map((c) => ({
        name: c.name,
        address: c.address,
        networkId: c.network.id,
        networkName: c.network.name,
        domain: c.domain,
      })),
    [contacts]
  );

  // What the three choosable rows currently read. Proper nouns and a currency
  // code — they ship identical in both languages, so the settings list states
  // the user's own choice without inventing any copy.
  const settingsOptionValues = useMemo(
    () => ({
      language: LANGUAGE_NAMES[currentLanguage as LanguageCode] || currentLanguage,
      currency: currency?.toUpperCase(),
      explorer: explorer?.name,
    }),
    [currentLanguage, currency, explorer]
  );

  // -- Panel Registry for SettingsPanelStack --

  const handleSettingsClose = useCallback(() => {
    setSettingsVisible(false);
    setSettingsInitialPanels(undefined);
  }, []);

  /**
   * Leaves a finished account flow, whichever surface it ran on.
   *
   * The panel is reachable from settings and from the wallet switcher, and it
   * does not know which one is above it — so completing closes both, landing
   * on home with the account it just created already active.
   */
  const handleAccountFlowComplete = useCallback(() => {
    setSettingsVisible(false);
    setSettingsInitialPanels(undefined);
    setWalletSwitcherVisible(false);
  }, []);

  const panelRegistry: MobilePanelRegistry = useMemo(
    () => ({
      avatar: ({ onBack }) => {
        if (!activeAccount) return null;
        return (
          <AccountAvatarPanel
            currentAvatarUrl={activeAccount.avatar}
            account={activeAccount}
            onSave={async (avatarUrl: string) => {
              await accountActions.editAccount(activeAccount.id, { avatar: avatarUrl });
              onBack();
            }}
            onBack={onBack}
          />
        );
      },
      security: ({ onBack }) => (
        <SecurityPanel
          onBack={onBack}
          isBiometricAvailable={biometricState.isAvailable && biometricState.isEnrolled}
          isBiometricEnabled={enableBiometric}
          onToggleBiometric={async (enabled: boolean) => {
            await setEnableBiometric(enabled);
          }}
          onPasswordChanged={clearBiometricKey}
        />
      ),
      privateKey: ({ onBack }) => {
        if (!activeAccount) return null;
        const networks = buildNetworkListFromAccount(activeAccount);
        return (
          <PrivateKeyPanel
            networks={networks}
            activeAccount={activeAccount}
            onBack={onBack}
            biometricAvailable={biometricState.isAvailable && biometricState.hasStoredKey}
            authenticateWithBiometric={authenticateWithBiometric}
          />
        );
      },
      language: ({ onBack }) => {
        const languageItems: LanguageSelectorItem[] = availableLanguages.map((item) => ({
          code: item.code,
          nativeName: LANGUAGE_NAMES[item.code as LanguageCode] || item.code,
        }));
        return (
          <LanguageSelector
            languages={languageItems}
            activeLanguageCode={currentLanguage}
            onSelectLanguage={async (code: string) => {
              await changeLanguage(code as LanguageCode);
              onBack();
            }}
            onBack={onBack}
          />
        );
      },
      currency: ({ onBack }) => {
        const currencyItems: CurrencySelectorItem[] = SUPPORTED_CURRENCIES.map((code) => ({
          code,
          name: CURRENCY_MAP[code].name,
          symbol: CURRENCY_MAP[code].symbol,
        }));
        return (
          <CurrencySelector
            currencies={currencyItems}
            activeCurrencyCode={currency}
            onSelectCurrency={async (code: string) => {
              await changeCurrency(code as CurrencyCode);
              onBack();
            }}
            onBack={onBack}
          />
        );
      },
      explorer: ({ onBack }) => {
        const explorerItems: ExplorerSelectorItem[] = explorers.map((e) => ({
          key: e.key,
          name: e.name,
        }));
        return (
          <ExplorerSelector
            explorers={explorerItems}
            activeExplorerName={explorer?.name || ''}
            onSelectExplorer={async (key: string) => {
              await changeExplorer(key);
              onBack();
            }}
            onBack={onBack}
            loading={explorerLoading}
          />
        );
      },
      network: ({ onBack }) => {
        const userNetworks = activeAccount?.networksAccounts
          ? allNetworks.filter((n) => Object.keys(activeAccount.networksAccounts!).includes(n.id))
          : allNetworks;
        const networkItems: NetworkSelectorItem[] = userNetworks.map((n) => ({
          id: n.id,
          name: n.name,
          blockchain: n.id.split('-')[0],
        }));
        return (
          <NetworkSelector
            networks={networkItems}
            activeNetworkId={networkId || 'solana-mainnet'}
            onSelectNetwork={(id: string) => {
              accountActions.changeNetwork(id);
              onBack();
            }}
            onBack={onBack}
          />
        );
      },
      addressBook: ({ onBack, onNavigate }) => (
        <AddressBookPanel
          contacts={addressBookItems}
          activeNetworkId={networkId || 'solana-mainnet'}
          onAddContact={() => onNavigate('address-book-add')}
          onEditContact={(contact: AddressBookItem) => {
            setEditingContact(contact);
            onNavigate('address-book-edit');
          }}
          onRemoveContact={async (addr: string) => {
            try {
              await removeContact(addr);
            } catch (err) {
              showAddressBookWriteError(err, 'settings.addressbook.remove_failed');
            }
          }}
          onBack={onBack}
          loading={addressBookLoading}
          error={addressBookError}
          onRetry={reloadAddressBook}
        />
      ),
      'address-book-add': ({ onBack }) => {
        const activeNet = allNetworks.find((n) => n.id === networkId) || allNetworks[0];
        const blockchain = (networkId || 'solana-mainnet').split('-')[0];
        return (
          <AddressAddPanel
            activeNetworkId={activeNet?.id || 'solana-mainnet'}
            activeNetworkName={
              activeNet?.name || t('general.network_solana_mainnet', 'Solana Mainnet')
            }
            activeBlockchain={blockchain}
            onSave={async (input: AddressInput) => {
              try {
                await addContact(input);
                onBack();
              } catch (err) {
                showAddressBookWriteError(err);
                // 'resolve' means the write persisted — leave the panel only on
                // a persist failure so the user can retry.
                if (err instanceof AddressbookError && err.kind === 'resolve') onBack();
              }
            }}
            onBack={onBack}
          />
        );
      },
      'address-book-edit': ({ onBack }) => {
        if (!editingContact) return null;
        const blockchain = (editingContact.networkId || 'solana-mainnet').split('-')[0];
        return (
          <AddressEditPanel
            contact={editingContact}
            activeBlockchain={blockchain}
            onSave={async (originalAddress: string, input: AddressInput) => {
              try {
                await editAddressBookContact(originalAddress, input);
                setEditingContact(null);
                onBack();
              } catch (err) {
                showAddressBookWriteError(err);
                if (err instanceof AddressbookError && err.kind === 'resolve') {
                  setEditingContact(null);
                  onBack();
                }
              }
            }}
            onBack={onBack}
          />
        );
      },
      trustedApps: ({ onBack }) => {
        const trustedAppItems: TrustedAppItem[] = Object.entries(activeTrustedApps || {}).map(
          ([domain, app]) => ({
            domain,
            name: app.name,
            icon: app.icon,
          })
        );
        return (
          <TrustedAppsSelector
            apps={trustedAppItems}
            onRevokeApp={async (domain: string) => {
              await accountActions.removeTrustedApp(domain);
            }}
            onBack={onBack}
          />
        );
      },
      support: ({ onBack }) => (
        <SupportSelector options={SUPPORT_OPTIONS} onOpenLink={openLink} onBack={onBack} />
      ),
      accounts: ({ onBack, onNavigate }) => (
        <AccountsPanel
          accounts={accounts}
          activeAccountId={activeAccount?.id || ''}
          onSelectAccount={(id: string) => accountActions.changeAccount(id)}
          onEditAccount={(id: string) => {
            setEditingAccountId(id);
            onNavigate('account-edit', { accountId: id });
          }}
          onDeleteAccount={(id: string) => accountActions.removeAccount(id)}
          onAddAccount={() => onNavigate('account-add')}
          onBack={onBack}
        />
      ),
      'account-edit': ({ onBack, onNavigate, ...props }) => {
        const targetId = (props.accountId as string) || editingAccountId || accountId || '';
        const account = accounts.find((a) => a.id === targetId) || activeAccount;
        if (!account) return null;
        return (
          <AccountEditPanel
            account={account}
            onEditName={() => {
              setEditingAccountId(account.id);
              onNavigate('account-name', { accountId: account.id });
            }}
            onEditAvatar={() => onNavigate('avatar')}
            onBackupSeed={() => onNavigate('backup')}
            onExportPrivateKey={() => onNavigate('privateKey')}
            onBack={onBack}
          />
        );
      },
      'account-name': ({ onBack, ...props }) => {
        const targetId = (props.accountId as string) || editingAccountId || accountId || '';
        const account = accounts.find((a) => a.id === targetId) || activeAccount;
        if (!account) return null;
        return (
          <AccountNamePanel
            currentName={account.name}
            onSave={async (name: string) => {
              await accountActions.editAccount(account.id, { name });
              onBack();
            }}
            onBack={onBack}
          />
        );
      },
      // A finished add lands on Home, not back on the settings list: the
      // account it just created is already the active one, so the useful next
      // screen is the wallet showing it.
      'account-add': ({ onBack }) => (
        <AccountAddPanel onComplete={handleAccountFlowComplete} onBack={onBack} />
      ),
      backup: ({ onBack }) => (
        <BackupPanel
          onBack={onBack}
          biometricAvailable={biometricState.isAvailable && biometricState.hasStoredKey}
          authenticateWithBiometric={authenticateWithBiometric}
        />
      ),
      about: ({ onBack }) => <AboutPanel onBack={onBack} />,
    }),
    [
      activeAccount,
      accountActions,
      accounts,
      accountId,
      networkId,
      allNetworks,
      biometricState,
      enableBiometric,
      setEnableBiometric,
      authenticateWithBiometric,
      clearBiometricKey,
      currentLanguage,
      availableLanguages,
      changeLanguage,
      currency,
      changeCurrency,
      explorers,
      explorer,
      changeExplorer,
      explorerLoading,
      addressBookItems,
      addressBookLoading,
      addressBookError,
      reloadAddressBook,
      addContact,
      editAddressBookContact,
      removeContact,
      showAddressBookWriteError,
      editingContact,
      editingAccountId,
      activeTrustedApps,
      handleAccountFlowComplete,
      openLink,
      t,
    ]
  );

  // -- Header handlers --

  const handleCopyAddress = useCallback(async () => {
    if (activeBlockchainAccount) {
      const addr = activeBlockchainAccount.getReceiveAddress();
      await Clipboard.setStringAsync(addr);
    }
  }, [activeBlockchainAccount]);

  // -- Wallet Switcher handlers --

  const handleWalletSwitcherClose = useCallback(() => {
    setWalletSwitcherVisible(false);
  }, []);

  const handleSelectAccount = useCallback(
    async (id: string) => {
      await accountActions.changeAccount(id);
      setWalletSwitcherVisible(false);
    },
    [accountActions]
  );

  const handleAddAccount = useCallback(() => {
    setWalletSwitcherVisible(false);
    setEditingAccountId(null);
    setSettingsInitialPanels([{ screen: 'account-add' }]);
    setSettingsVisible(true);
  }, []);

  const handleEditAccount = useCallback((id: string) => {
    setWalletSwitcherVisible(false);
    setEditingAccountId(id);
    setSettingsInitialPanels([
      { screen: 'accounts' },
      { screen: 'account-edit', props: { accountId: id } },
    ]);
    setSettingsVisible(true);
  }, []);

  const handleDeleteAccount = useCallback(
    async (id: string) => {
      await accountActions.removeAccount(id);
    },
    [accountActions]
  );

  // -- Settings: Remove wallet handlers --

  const handleRemoveAllWallets = useCallback(() => {
    Alert.alert(
      t('settings.remove_all_title'),
      t('settings.wallets.remove_all_wallets_description'),
      [
        { text: t('actions.cancel'), style: 'cancel' },
        {
          text: t('actions.remove_all'),
          style: 'destructive',
          onPress: async () => {
            try {
              await setEnableBiometric(false);
              await accountActions.removeAllAccounts();
              router.replace('/(auth)');
            } catch (error) {
              console.error('Failed to remove all wallets:', error);
              Alert.alert(t('general.error'), t('settings.remove_wallets_error'));
            }
          },
        },
      ]
    );
  }, [accountActions, router, setEnableBiometric, t]);

  const handleRemoveWallet = useCallback(async () => {
    const { accounts: accts } = accountState;
    const currentAccount = activeAccount;

    if (!currentAccount) return;

    if (accts.length <= 1) {
      handleRemoveAllWallets();
      return;
    }

    Alert.alert(
      t('settings.remove_wallet_title'),
      t('settings.wallets.remove_wallet_description'),
      [
        { text: t('actions.cancel'), style: 'cancel' },
        {
          text: t('settings.confirm_remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await accountActions.removeAccount(currentAccount.id);
            } catch (error) {
              console.error('Failed to remove wallet:', error);
              Alert.alert(t('general.error'), t('settings.remove_wallet_error'));
            }
          },
        },
      ]
    );
  }, [accountState, activeAccount, accountActions, handleRemoveAllWallets, t]);

  return (
    <TaskChromeProvider>
      <View style={styles.container}>
        <StatusBar style="light" />

        {/* Background layers wrapped in BlurTargetView for Android blur targeting */}
        <BlurTargetView ref={blurTargetRef} style={StyleSheet.absoluteFill}>
          {/* Layer 1: the water column — a depth ramp that darkens toward the
            bottom, plus the marine snow field across the top. The ramp starts
            at the ground the app already painted, so nothing above it seams;
            the snow is spent before the first token row, which is what keeps
            it on the right side of The Scales Exclusion Rule. */}
          <DepthBackground />

          {/* Layer 2: the deep field. It belongs here and only here — on the
            ground, in the same plane as the ramp and the snow. It used to
            tile behind whole tabs *and* live inside the balance card; the
            card is content and has lost it, because the motif belongs to the
            water and content stays plain. Here it is safe for the reason the
            snow is: everything that carries a value — rows, cards, inputs —
            is opaque and covers it. The snow is what gives the 3.2× scale
            something to be large against rather than merely near. */}
          <ScalesBackground variant="deepField" />

          {/* Layer 3: Bottom fade gradient. Ends on the ramp's own floor rather
            than the old flat ground, which would have lightened the abyss. */}
          <LinearGradient
            colors={['transparent', semantic.water.gradient[1]]}
            style={styles.bottomFadeGradient}
            pointerEvents="none"
          />
        </BlurTargetView>

        {/* Tab screens fill the remaining space */}
        <DeveloperModeProvider value={{ developerNetworks }}>
          <BlurTargetProvider value={blurTargetRef}>
            <Tabs
              tabBar={(props) => <GlassTabBar {...props} />}
              screenOptions={{
                headerShown: false,
                tabBarStyle: { display: 'none' },
              }}
            >
              <Tabs.Screen name="index" options={{ title: t('tabs.home', 'Home') }} />
              <Tabs.Screen
                name="collectibles"
                options={{ title: t('tabs.collectibles', 'Collectibles') }}
              />
              <Tabs.Screen name="swap" options={{ title: t('tabs.swap', 'Swap') }} />
              <Tabs.Screen
                name="settings"
                options={{ href: null, title: t('tabs.settings', 'Settings') }}
              />
            </Tabs>
          </BlurTargetProvider>
        </DeveloperModeProvider>

        <View
          pointerEvents="none"
          style={[
            styles.topSafeAreaOverlay,
            { height: topInset },
            DEBUG_LAYER_COLORS && { backgroundColor: DEBUG_LAYER_COLOR.topSafeAreaOverlay },
          ]}
        />

        {/* Unified Gate — lock screen, header, settings, wallet switcher */}
        <GateContainer
          state={gateState}
          expandedHeader={expandedHeader}
          onBackdropPress={() => {
            if (settingsVisible) handleSettingsClose();
            if (walletSwitcherVisible) handleWalletSwitcherClose();
          }}
          lockContent={
            <LockContent
              locked={accountState.locked}
              onUnlock={handleLockUnlock}
              onUnlockWithKey={handleLockUnlockWithKey}
              onGetDerivedKey={handleGetDerivedKey}
              onUnlockExited={handleUnlockExited}
              onRemoveAllAccounts={handleRemoveAllAccountsFromLock}
              biometric={lockBiometricConfig}
            />
          }
          headerContent={
            <HeaderContent
              accountName={accountName}
              address={address}
              onCopyAddress={handleCopyAddress}
              onSettingsPress={() => setSettingsVisible(true)}
              onWalletPress={() => setWalletSwitcherVisible(true)}
              developerMode={developerNetworks}
              avatarUrl={activeAccount?.avatar}
              accountId={activeAccount?.id}
            />
          }
          settingsContent={
            <PanelHost
              visible={settingsVisible}
              registry={panelRegistry}
              initialPanels={settingsInitialPanels}
              onHeaderChange={handleSettingsHeaderChange}
              baseTitle={t('settings.title')}
              resolvePanelTitle={resolvePanelTitle}
              dynamicHeaderScreens={DYNAMIC_HEADER_SCREENS}
            >
              {() => (
                <SettingsSheet
                  visible={settingsVisible}
                  onClose={handleSettingsClose}
                  optionValues={settingsOptionValues}
                  developerNetworksEnabled={developerNetworks}
                  onDeveloperNetworksToggle={toggleDeveloperNetworks}
                  analyticsEnabled={analyticsConsent}
                  onAnalyticsToggle={setAnalyticsConsent}
                  onRemoveWallet={handleRemoveWallet}
                  onRemoveAllWallets={handleRemoveAllWallets}
                />
              )}
            </PanelHost>
          }
          walletsContent={
            <PanelHost
              visible={walletSwitcherVisible}
              registry={panelRegistry}
              onHeaderChange={handleWalletsHeaderChange}
              baseTitle={t('settings.wallets.your_wallets')}
              resolvePanelTitle={resolvePanelTitle}
              dynamicHeaderScreens={DYNAMIC_HEADER_SCREENS}
            >
              {() => (
                <WalletSwitcherSheet
                  visible={walletSwitcherVisible}
                  onClose={handleWalletSwitcherClose}
                  accounts={accounts}
                  activeAccountId={accountId ?? ''}
                  onSelectAccount={handleSelectAccount}
                  onAddAccount={handleAddAccount}
                  onEditAccount={handleEditAccount}
                  onDeleteAccount={handleDeleteAccount}
                />
              )}
            </PanelHost>
          }
        />
      </View>
    </TaskChromeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  bottomFadeGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 180,
    bottom: 0,
  },
  topSafeAreaOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.primary,
    zIndex: 5,
  },
});
