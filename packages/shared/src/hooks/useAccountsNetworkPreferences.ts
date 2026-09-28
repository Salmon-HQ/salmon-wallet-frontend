import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import merge from 'lodash-es/merge';
import omit from 'lodash-es/omit';

import { getStorageItem, setStorageItem, STORAGE_KEYS } from '../storage';
import type { TrustedApp, TrustedApps } from '../types/trusted-app';
import type { CustomTokens, TokenInfo, TokenToImport } from '../types/token';

interface UseAccountsNetworkPreferencesParams {
  networkId: string | null;
  trustedApps: TrustedApps;
  setTrustedApps: Dispatch<SetStateAction<TrustedApps>>;
  tokens: CustomTokens;
  setTokens: Dispatch<SetStateAction<CustomTokens>>;
}

interface UseAccountsNetworkPreferencesResult {
  activeTrustedApps: Record<string, TrustedApp>;
  activeTokens: Record<string, TokenInfo>;
  addTrustedApp: (domain: string, app?: TrustedApp, targetNetworkId?: string) => Promise<void>;
  removeTrustedApp: (domain: string) => Promise<void>;
  importTokens: (targetNetworkId: string, tokenList?: TokenToImport[]) => Promise<void>;
}

export function useAccountsNetworkPreferences({
  networkId,
  trustedApps,
  setTrustedApps,
  tokens,
  setTokens,
}: UseAccountsNetworkPreferencesParams): UseAccountsNetworkPreferencesResult {
  const activeTrustedApps = useMemo(
    (): Record<string, TrustedApp> => (networkId ? (trustedApps[networkId] ?? {}) : {}),
    [trustedApps, networkId]
  );

  const activeTokens = useMemo(
    (): Record<string, TokenInfo> => (networkId ? (tokens[networkId] ?? {}) : {}),
    [tokens, networkId]
  );

  // Trusted apps are read from storage before every write, never taken from
  // this document's copy: in the extension each document (side panel, every
  // approval popup) loads its copy once at unlock, so writing that copy back
  // restores a site another document revoked since.
  const addTrustedApp = useCallback(
    async (
      domain: string,
      { name, icon, address }: TrustedApp = {},
      targetNetworkId?: string
    ): Promise<void> => {
      const resolvedNetworkId = targetNetworkId ?? networkId;
      if (!resolvedNetworkId) return;

      const current = (await getStorageItem<TrustedApps>(STORAGE_KEYS.TRUSTED_APPS)) ?? {};
      const newTrustedApps: TrustedApps = {
        ...current,
        [resolvedNetworkId]: {
          ...current[resolvedNetworkId],
          [domain]: { name, icon, ...(address ? { address } : {}) },
        },
      };
      await setStorageItem(STORAGE_KEYS.TRUSTED_APPS, newTrustedApps);
      setTrustedApps(newTrustedApps);
    },
    [networkId, setTrustedApps]
  );

  // Revoking removes the site from every network. Trust on any network lets a
  // site open signing prompts, and the list only shows the active network, so
  // a grant left on another network would outlive the revoke unseen.
  const removeTrustedApp = useCallback(
    async (domain: string): Promise<void> => {
      const current = (await getStorageItem<TrustedApps>(STORAGE_KEYS.TRUSTED_APPS)) ?? {};
      const newTrustedApps: TrustedApps = Object.fromEntries(
        Object.entries(current).map(([network, apps]) => [network, omit(apps, domain)])
      );
      await setStorageItem(STORAGE_KEYS.TRUSTED_APPS, newTrustedApps);
      setTrustedApps(newTrustedApps);
    },
    [setTrustedApps]
  );

  const importTokens = useCallback(
    async (targetNetworkId: string, tokenList: TokenToImport[] = []): Promise<void> => {
      const importedTokens = tokenList
        .filter(({ address }) => address)
        .reduce(
          (obj, token) => ({
            ...obj,
            [token.address]: omit(token, 'address'),
          }),
          {} as Record<string, TokenInfo>
        );

      const newTokens = { ...tokens };
      merge(newTokens, { [targetNetworkId]: importedTokens });
      await setStorageItem(STORAGE_KEYS.CUSTOM_TOKENS, newTokens);
      setTokens(newTokens);
    },
    [tokens, setTokens]
  );

  return {
    activeTrustedApps,
    activeTokens,
    addTrustedApp,
    removeTrustedApp,
    importTokens,
  };
}
