import { SeedVaultError, type SeedVaultAccess, type SeedVaultListedAccount } from '@salmon/shared';
import { useEffect, useMemo, useState } from 'react';

import {
  authorizeSeed,
  createSeed,
  importSeed,
  isSeedVaultAvailable,
  listAuthorizedSeeds,
  listSeedVaultAccounts,
  requestSeedVaultPermission,
} from './bridge';

/**
 * Seed Vault for the add-wallet flow, or undefined where the device has none
 * (so "Use Seed Vault" is not offered). Every call first makes sure Android
 * granted the permission, because the user can revoke it at any time.
 */
export function useSeedVaultAccess(): SeedVaultAccess | undefined {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let live = true;
    void isSeedVaultAvailable().then((yes) => live && setAvailable(yes));
    return () => {
      live = false;
    };
  }, []);

  return useMemo(() => {
    if (!available) return undefined;
    const permitted = async () => {
      if (!(await requestSeedVaultPermission())) throw new SeedVaultError('cancelled');
    };
    const accountsOf = async (authTokens: string[]): Promise<SeedVaultListedAccount[]> =>
      (
        await Promise.all(
          authTokens.map(async (authToken) =>
            (await listSeedVaultAccounts(authToken)).map((a) => ({ ...a, authToken }))
          )
        )
      ).flat();

    return {
      listAccounts: async () => {
        await permitted();
        const seeds = await listAuthorizedSeeds();
        return accountsOf(seeds.length > 0 ? seeds : [await authorizeSeed()]);
      },
      authorizeAnother: async () => {
        await permitted();
        await authorizeSeed();
      },
      createSeed: async () => {
        await permitted();
        await createSeed();
      },
      importSeed: async () => {
        await permitted();
        await importSeed();
      },
    };
  }, [available]);
}
