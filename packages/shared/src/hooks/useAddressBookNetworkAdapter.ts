import { useMemo } from 'react';

import type { AddressBookNetwork, NetworkAdapter } from '../types/address';
import type { BlockchainType } from '../types/blockchain';

const toAddressBookNetwork = (network: { id: string; name: string }): AddressBookNetwork => ({
  id: network.id,
  name: network.name,
  blockchain: network.id.split('-')[0] as BlockchainType,
});

/**
 * The lookup `useAddressbook` asks for, over the networks a screen offers: a
 * contact's network id resolved to its name and chain.
 */
export function useAddressBookNetworkAdapter(
  networks: ReadonlyArray<{ id: string; name: string }>
): NetworkAdapter {
  return useMemo(
    () => ({
      getNetwork: async (id: string) => {
        const found = networks.find((n) => n.id === id);
        return found && toAddressBookNetwork(found);
      },
      getNetworks: async () => networks.map(toAddressBookNetwork),
    }),
    [networks]
  );
}
