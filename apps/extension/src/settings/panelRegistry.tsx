/**
 * The settings panel registry on the DOM — one body per `SettingsScreen` key.
 *
 * The mobile twin is `apps/mobile/src/settings/panelRegistry.tsx`, and it moved
 * here for the same reason: the registry used to live inline in the screen that
 * happened to mount Settings (Home), which tied every panel to Home being on
 * screen. Settings is a page of its own now, so the registry is a hook that
 * page calls — the page owns navigation, the registry owns what each body is
 * and which data it needs.
 *
 * The panels themselves are unchanged; the surface under them moved.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AddressbookError,
  CURRENCY_ITEMS,
  SUPPORT_OPTIONS,
  toExplorerItems,
  toLanguageItems,
  toTrustedAppItems,
  useAccountsContext,
  useCurrencyContext,
  useSettingsPanelData,
  useDeveloperModeSettings,
  useLanguage,
  useTheme,
  type AddressBookItem,
  type AddressInput,
  type AppearancePreference,
  type CurrencyCode,
  type LanguageCode,
} from '@salmon/shared';

import {
  AboutPanel,
  AccountAddPanel,
  AccountAvatarPanel,
  AccountEditPanel,
  AccountNamePanel,
  AccountsPanel,
  AddressAddPanel,
  AddressBookPanel,
  AddressEditPanel,
  AppearanceSelector,
  BackupPanel,
  CurrencySelector,
  ExplorerSelector,
  LanguageSelector,
  PrivateKeyPanel,
  SecurityPanel,
  SupportSelector,
  TrustedAppsSelector,
  type PanelRegistry,
} from '../components';
import { clearSessionKey } from '../utils/sessionKeyCache';

export function useSettingsPanelRegistry(): PanelRegistry {
  const { t } = useTranslation();

  const [accountState, actions] = useAccountsContext();
  const { accounts, accountId, activeAccount, activeBlockchainAccount, networkId } = accountState;
  const activeTrustedApps = accountState.activeTrustedApps;

  // The flag comes from the provider the side panel root mounts — a second
  // `useUserConfig` instance here would read its own copy and drift from the
  // carousel's (the mobile registry keeps the same discipline).
  const { developerNetworks } = useDeveloperModeSettings();

  const {
    explorer,
    explorers,
    changeExplorer,
    explorerLoading,
    allNetworks,
    addressBookItems,
    addressBookError,
    addContact,
    editAddressBookContact,
    removeContact,
    reloadAddressBook,
  } = useSettingsPanelData({
    activeAccount,
    hasBlockchainAccount: !!activeBlockchainAccount,
    networkId,
    developerNetworks,
  });

  const { currentLanguage, availableLanguages, changeLanguage } = useLanguage();
  const [{ currency }, { changeCurrency }] = useCurrencyContext();
  const { preference: appearancePreference, setPreference: setAppearancePreference } = useTheme();

  // Inline error for address-book writes (translation key, rendered by the open panel)
  const [addressBookWriteErrorKey, setAddressBookWriteErrorKey] = useState<string | null>(null);
  const showAddressBookWriteError = useCallback((err: unknown) => {
    setAddressBookWriteErrorKey(
      err instanceof AddressbookError && err.kind === 'resolve'
        ? 'settings.addressbook.resolve_failed'
        : 'settings.addressbook.save_failed'
    );
  }, []);

  const [editingContact, setEditingContact] = useState<AddressBookItem | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  return useMemo(
    () => ({
      avatar: ({ onBack }) => {
        if (!activeAccount) return null;
        return (
          <AccountAvatarPanel
            currentAvatarUrl={activeAccount.avatar}
            account={activeAccount}
            onSave={async (avatarUrl: string) => {
              await actions.editAccount(activeAccount.id, { avatar: avatarUrl });
              onBack();
            }}
            onBack={onBack}
          />
        );
      },
      backup: ({ onBack }) => <BackupPanel onBack={onBack} />,
      privateKey: ({ onBack }) => <PrivateKeyPanel onBack={onBack} />,
      currency: ({ onBack }) => (
        <CurrencySelector
          currencies={CURRENCY_ITEMS}
          activeCurrencyCode={currency}
          onSelectCurrency={(code) => {
            changeCurrency(code as CurrencyCode);
          }}
          onBack={onBack}
        />
      ),
      appearance: ({ onBack }) => (
        <AppearanceSelector
          activePreference={appearancePreference}
          onSelectPreference={(pref: AppearancePreference) => {
            void setAppearancePreference(pref);
          }}
          onBack={onBack}
        />
      ),
      about: ({ onBack }) => <AboutPanel onBack={onBack} />,
      support: ({ onBack }) => (
        <SupportSelector
          options={SUPPORT_OPTIONS}
          onOpenLink={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
          onBack={onBack}
        />
      ),
      language: ({ onBack }) => (
        <LanguageSelector
          languages={toLanguageItems(availableLanguages)}
          activeLanguageCode={currentLanguage}
          onSelectLanguage={(code) => {
            void changeLanguage(code as LanguageCode);
          }}
          onBack={onBack}
        />
      ),
      explorer: ({ onBack }) => (
        <ExplorerSelector
          explorers={toExplorerItems(explorers)}
          activeExplorerName={explorer?.name || ''}
          onSelectExplorer={(key) => {
            changeExplorer(key);
          }}
          onBack={onBack}
          loading={explorerLoading}
        />
      ),
      addressBook: ({ onBack, onNavigate }) => (
        <AddressBookPanel
          contacts={addressBookItems}
          activeNetworkId={networkId || 'solana-mainnet'}
          onAddContact={() => {
            setAddressBookWriteErrorKey(null);
            onNavigate('address-book-add');
          }}
          onEditContact={(contact) => {
            setAddressBookWriteErrorKey(null);
            setEditingContact(contact);
            onNavigate('address-book-edit');
          }}
          onRemoveContact={async (address) => {
            await removeContact(address);
          }}
          onBack={onBack}
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
            activeNetworkName={activeNet?.name || 'Solana Mainnet'}
            activeBlockchain={blockchain}
            onSave={async (input: AddressInput) => {
              setAddressBookWriteErrorKey(null);
              try {
                await addContact(input);
              } catch (err) {
                showAddressBookWriteError(err);
              }
            }}
            onBack={onBack}
            errorText={addressBookWriteErrorKey ? t(addressBookWriteErrorKey) : undefined}
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
              setAddressBookWriteErrorKey(null);
              try {
                await editAddressBookContact(originalAddress, input);
                setEditingContact(null);
              } catch (err) {
                showAddressBookWriteError(err);
              }
            }}
            onBack={onBack}
            errorText={addressBookWriteErrorKey ? t(addressBookWriteErrorKey) : undefined}
          />
        );
      },
      trustedApps: ({ onBack }) => (
        <TrustedAppsSelector
          apps={toTrustedAppItems(activeTrustedApps)}
          onRevokeApp={(domain) => {
            actions.removeTrustedApp(domain);
          }}
          onBack={onBack}
        />
      ),
      security: ({ onBack, onNavigate }) => (
        <SecurityPanel
          onBack={onBack}
          onNavigate={onNavigate}
          onPasswordChanged={clearSessionKey}
        />
      ),
      accounts: ({ onBack, onNavigate }) => (
        <AccountsPanel
          accounts={accounts}
          activeAccountId={accountId || ''}
          onSelectAccount={(id) => actions.changeAccount(id)}
          onEditAccount={(id) => {
            setEditingAccountId(id);
            onNavigate('account-edit', { accountId: id });
          }}
          onDeleteAccount={(id) => actions.removeAccount(id)}
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
              await actions.editAccount(account.id, { name });
              onBack();
            }}
            onBack={onBack}
          />
        );
      },
      // One add-wallet screen, two entry points. Leaving Settings returns to
      // whichever screen opened it, so the finished flow lands back there with
      // the new wallet already active — no `returnTo` to carry.
      'account-add': ({ onBack, onWait, onClose }) => (
        <AccountAddPanel
          onComplete={() => {}}
          onBack={onBack}
          onWait={onWait}
          onCloseSettings={onClose}
        />
      ),
    }),
    [
      activeAccount,
      actions,
      accounts,
      accountId,
      networkId,
      allNetworks,
      currentLanguage,
      availableLanguages,
      changeLanguage,
      currency,
      changeCurrency,
      appearancePreference,
      setAppearancePreference,
      explorers,
      explorer,
      changeExplorer,
      explorerLoading,
      addressBookItems,
      addressBookError,
      reloadAddressBook,
      addContact,
      editAddressBookContact,
      removeContact,
      showAddressBookWriteError,
      addressBookWriteErrorKey,
      editingContact,
      editingAccountId,
      activeTrustedApps,
      t,
    ]
  );
}
