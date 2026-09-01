/**
 * The settings panel registry — one body per `SettingsScreen` key.
 *
 * It used to live inline in the tabs layout, where the gate mounted the whole
 * tree behind the header. Settings is a stack of real screens now, so the
 * registry is a hook the `[panel]` route calls: the route owns navigation and
 * the header, the registry owns what the body is and which data it needs.
 *
 * Every panel keeps the props it already had, so the bodies themselves are
 * unchanged — the surface under them moved, not the panels.
 */
import React, { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import {
  useAccountsContext,
  useUserConfig,
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
} from '../components';
import { useLanguage } from '../i18n';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import type { MobilePanelRegistry } from './types';
import { resolveReturnTo } from './returnTo';

export function useSettingsPanelRegistry(): MobilePanelRegistry {
  const { t } = useTranslation();
  const router = useRouter();
  const openLink = useOpenLink();

  const [accountState, accountActions] = useAccountsContext();
  const { accounts, accountId, activeAccount, activeBlockchainAccount, networkId } = accountState;
  const activeTrustedApps = accountState.activeTrustedApps;

  const userConfigAccount = useMemo(
    () => ({
      network: {
        environment: (activeBlockchainAccount ? networkId || 'solana-mainnet' : 'solana-mainnet') as
          | 'solana-mainnet'
          | 'solana-devnet',
        blockchain: 'solana',
      },
    }),
    [activeBlockchainAccount, networkId]
  );

  const {
    developerNetworks,
    explorer,
    explorers,
    changeExplorer,
    isLoading: explorerLoading,
  } = useUserConfig({ activeBlockchainAccount: userConfigAccount });

  const { currentLanguage, availableLanguages, changeLanguage } = useLanguage();
  const [{ currency }, { changeCurrency }] = useCurrencyContext();
  const { allNetworks } = useAvailableNetworks({
    activeBlockchainAccount: userConfigAccount,
    developerNetworks,
  });

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

  const {
    state: biometricState,
    enableBiometric,
    setEnableBiometric,
    authenticateWithBiometric,
    clearBiometricKey,
  } = useBiometricAuth();

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

  return useMemo<MobilePanelRegistry>(
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
      security: ({ onBack, onNavigate }) => (
        <SecurityPanel
          onBack={onBack}
          onNavigate={onNavigate}
          isBiometricAvailable={biometricState.isAvailable && biometricState.isEnrolled}
          biometricType={biometricState.biometricType}
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
          // The contact travels as its address — a route parameter is a string,
          // and the list this panel already reads is the same one the edit
          // screen resolves it from.
          onEditContact={(contact: AddressBookItem) =>
            onNavigate('address-book-edit', { address: contact.address })
          }
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
      'address-book-edit': ({ onBack, ...props }) => {
        const target = addressBookItems.find((c) => c.address === (props.address as string));
        if (!target) return null;
        const blockchain = (target.networkId || 'solana-mainnet').split('-')[0];
        return (
          <AddressEditPanel
            contact={target}
            activeBlockchain={blockchain}
            onSave={async (originalAddress: string, input: AddressInput) => {
              try {
                await editAddressBookContact(originalAddress, input);
                onBack();
              } catch (err) {
                showAddressBookWriteError(err);
                if (err instanceof AddressbookError && err.kind === 'resolve') onBack();
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
          onEditAccount={(id: string) => onNavigate('account-edit', { accountId: id })}
          onDeleteAccount={(id: string) => accountActions.removeAccount(id)}
          onAddAccount={() => onNavigate('account-add')}
          onBack={onBack}
        />
      ),
      'account-edit': ({ onBack, onNavigate, ...props }) => {
        const targetId = (props.accountId as string) || accountId || '';
        const account = accounts.find((a) => a.id === targetId) || activeAccount;
        if (!account) return null;
        return (
          <AccountEditPanel
            account={account}
            onEditName={() => onNavigate('account-name', { accountId: account.id })}
            onEditAvatar={() => onNavigate('avatar')}
            onBackupSeed={() => onNavigate('backup')}
            onExportPrivateKey={() => onNavigate('privateKey')}
            onBack={onBack}
          />
        );
      },
      'account-name': ({ onBack, ...props }) => {
        const targetId = (props.accountId as string) || accountId || '';
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
      // One add-wallet screen, two entry points. `returnTo` says which one
      // opened it, so completing lands on the surface the user came from with
      // the new wallet already active — Home by default, as it always did.
      'account-add': ({ onBack, ...props }) => (
        <AccountAddPanel
          onComplete={() => router.replace(resolveReturnTo(props.returnTo as string | undefined))}
          onBack={onBack}
        />
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
      activeTrustedApps,
      openLink,
      router,
      t,
    ]
  );
}
