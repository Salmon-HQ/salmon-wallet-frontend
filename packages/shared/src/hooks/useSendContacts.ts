/**
 * Hook that provides filtered address book contacts and own wallets
 * for the send flow.
 *
 * Composes useAccountsContext, useAvailableNetworks, and useAddressbook
 * to produce two filtered lists:
 * - contacts: address book entries matching the active network, excluding the sender
 * - ownWallets: user's other wallet addresses on the active network, excluding the sender
 *
 * @module hooks/useSendContacts
 */

import { useMemo } from 'react';
import { useAccountsContext } from '../contexts/AccountsContext';
import { useAvailableNetworks } from './useAvailableNetworks';
import { useAddressbook } from './useAddressbook';
import type { NetworkAdapter, AddressBookNetwork } from '../types/address';
import type { BlockchainType } from '../types/blockchain';
import type { UseSendContactsResult } from '../types/ui/send-sheet';

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Provides filtered contacts and own wallets for the send flow.
 *
 * @param senderAddress - The current sender's blockchain address (excluded from results)
 * @returns Filtered contacts, own wallets, and loading state
 */
export function useSendContacts(senderAddress: string): UseSendContactsResult {
  const [accountState] = useAccountsContext();
  const { accounts, networkId } = accountState;

  // Build network adapter from available networks
  const { allNetworks } = useAvailableNetworks({
    activeBlockchainAccount: {
      network: {
        environment: (networkId || 'solana-mainnet') as 'solana-mainnet' | 'solana-devnet',
        blockchain: networkId?.split('-')[0] || 'solana',
      },
    },
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

  const [{ contacts: allContacts, isLoading }] = useAddressbook({ networkAdapter });

  // Filter contacts by active network and exclude sender
  const contacts = useMemo(() => {
    if (!networkId) return [];
    return allContacts
      .filter((c) => c.network.id === networkId && c.address !== senderAddress)
      .map((c) => ({
        name: c.name,
        address: c.address,
        networkName: c.network.name,
        blockchain: c.network.blockchain || c.network.id.split('-')[0],
        domain: c.domain,
      }));
  }, [allContacts, networkId, senderAddress]);

  // Build own wallets list: all accounts' addresses on the active network, excluding sender
  const ownWallets = useMemo(() => {
    if (!networkId || !accounts || accounts.length <= 1) return [];

    const wallets: { accountName: string; address: string }[] = [];
    for (const account of accounts) {
      const networkAccounts = account.networksAccounts[networkId];
      if (!networkAccounts) continue;

      for (const bcAccount of networkAccounts) {
        if (!bcAccount) continue;
        const address = bcAccount.getReceiveAddress();
        if (address && address !== senderAddress) {
          wallets.push({
            accountName: account.name,
            address,
          });
        }
      }
    }
    return wallets;
  }, [accounts, networkId, senderAddress]);

  return { contacts, ownWallets, isLoading };
}
