/**
 * The data every settings panel registry needs, on both platforms.
 *
 * The two registries (`apps/mobile/src/settings/panelRegistry.tsx` and
 * `apps/extension/src/settings/panelRegistry.tsx`) render different widgets
 * from the same facts: which explorer is chosen, which networks this wallet
 * may be shown, and the address book keyed to those networks. Those facts are
 * not presentational, so they live here once — the registries keep only the
 * bodies.
 *
 * `developerNetworks` is a parameter rather than a hook call: each app reads
 * the flag from the provider its own root mounts, and a second instance here
 * would drift from the one the rest of the app is reading.
 */
import { useMemo } from 'react';

import { useAddressbook } from './useAddressbook';
import { useAvailableNetworks } from './useAvailableNetworks';
import { useUserConfig } from './useUserConfig';
import { toAddressBookItems } from '../settings/items';
import type { AddressBookNetwork, NetworkAdapter } from '../types/address';
import type { BlockchainType, NetworkId } from '../types/blockchain';
import type { AddressBookItem } from '../types/settings';
import type { Account } from '../types/account';

export interface UseSettingsPanelDataParams {
  /** The wallet whose held networks decide what may be offered. */
  activeAccount: Account | null | undefined;
  /** Whether the account has a blockchain account at all. */
  hasBlockchainAccount: boolean;
  /** The network the session stands on. */
  networkId: string | null | undefined;
  /** The developer-networks flag, read from the app's own provider. */
  developerNetworks: boolean;
}

export function useSettingsPanelData({
  activeAccount,
  hasBlockchainAccount,
  networkId,
  developerNetworks,
}: UseSettingsPanelDataParams) {
  const userConfigAccount = useMemo(
    () => ({
      network: {
        environment: (hasBlockchainAccount ? networkId || 'solana-mainnet' : 'solana-mainnet') as
          'solana-mainnet' | 'solana-devnet',
        blockchain: networkId?.split('-')[0] || 'solana',
      },
    }),
    [hasBlockchainAccount, networkId]
  );

  const {
    explorer,
    explorers,
    changeExplorer,
    isLoading: explorerLoading,
  } = useUserConfig({ activeBlockchainAccount: userConfigAccount });

  // The offer is the enabled networks this wallet actually holds; the active
  // network stays offered even with the flag off, so the panel can always
  // reach the page the session is standing on (spec 026).
  const heldNetworkIds = useMemo(
    () =>
      activeAccount?.networksAccounts ? Object.keys(activeAccount.networksAccounts) : undefined,
    [activeAccount]
  );
  const { allNetworks } = useAvailableNetworks({
    activeBlockchainAccount: userConfigAccount,
    developerNetworks,
    heldNetworkIds,
    activeNetworkId: networkId as NetworkId | null | undefined,
  });

  const networkAdapter: NetworkAdapter = useMemo(
    () => ({
      getNetwork: async (id: string): Promise<AddressBookNetwork | undefined> => {
        const found = allNetworks.find((n) => n.id === id);
        if (!found) return undefined;
        return {
          id: found.id,
          name: found.name,
          blockchain: found.id.split('-')[0] as BlockchainType,
        };
      },
      getNetworks: async (): Promise<AddressBookNetwork[]> =>
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

  const addressBookItems: AddressBookItem[] = useMemo(
    () => toAddressBookItems(contacts),
    [contacts]
  );

  return {
    userConfigAccount,
    explorer,
    explorers,
    changeExplorer,
    explorerLoading,
    allNetworks,
    networkAdapter,
    addressBookItems,
    addressBookLoading,
    addressBookError,
    addContact,
    editAddressBookContact,
    removeContact,
    reloadAddressBook,
  };
}
