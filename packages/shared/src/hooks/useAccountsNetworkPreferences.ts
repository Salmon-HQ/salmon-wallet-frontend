import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import merge from 'lodash-es/merge';
import omit from 'lodash-es/omit';

import { setStorageItem, STORAGE_KEYS } from '../storage';
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

  const addTrustedApp = useCallback(
    async (
      domain: string,
      { name, icon }: TrustedApp = {},
      targetNetworkId?: string
    ): Promise<void> => {
      const resolvedNetworkId = targetNetworkId ?? networkId;
      if (!resolvedNetworkId) return;

      const newTrustedApps = { ...trustedApps };
      merge(newTrustedApps, { [resolvedNetworkId]: { [domain]: { name, icon } } });
      await setStorageItem(STORAGE_KEYS.TRUSTED_APPS, newTrustedApps);
      setTrustedApps(newTrustedApps);
    },
    [trustedApps, networkId, setTrustedApps]
  );

  const removeTrustedApp = useCallback(
    async (domain: string): Promise<void> => {
      if (!networkId) return;

      const newTrustedApps = { ...trustedApps };
      if (newTrustedApps[networkId]) {
        delete newTrustedApps[networkId][domain];
      }
      await setStorageItem(STORAGE_KEYS.TRUSTED_APPS, newTrustedApps);
      setTrustedApps(newTrustedApps);
    },
    [trustedApps, networkId, setTrustedApps]
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
