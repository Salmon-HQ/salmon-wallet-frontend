/**
 * useHomePowerups — the Powerups slice of Home, held once.
 *
 * Both Homes (`apps/mobile/app/(app)/(tabs)/index.tsx`,
 * `apps/extension/src/pages/home/HomePage.tsx`) turn the same installed-ids
 * list into a sub-tab set for `useHomeShell`, and the same catalogue state
 * into the `+` drawer. `POWERUPS` and `getPowerupCatalog` are already the one
 * shared registry both platforms import (through their aliased `powerups`
 * entry), so this hook reads them directly rather than taking them as
 * params.
 *
 * Split in two calls because of an ordering constraint: `powerupTabs` is an
 * input to `useHomeShell` (it decides which sub-tabs are offered), while the
 * catalogue needs `useHomeShell`'s OUTPUT — the network the screen currently
 * stands on. One combined hook cannot sit on both sides of that call.
 *
 * Readers: both Homes.
 */
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Straight from the registry/catalog modules, not the `../powerups` barrel:
// that barrel also re-exports the swap surface, which pulls in an ESM-only
// dependency (`lodash-es`) Jest's CJS transform for `requireActual` cannot
// parse — both Home tests use `requireActual` to get the real hook.
import { getPowerupCatalog } from '../powerups/catalog';
import { POWERUPS } from '../powerups/registry';
import type { PowerupsCatalogEntry } from '../types/ui/index';
import type { HomePowerupTab, HomeSubTabKey } from './useHomeShell';

export interface UseHomePowerupTabsParams {
  /** What this device has installed. */
  installed: readonly string[];
}

/** The installed Powerups, as Home surfaces — `useHomeShell`'s `powerupTabs` input. */
export function useHomePowerupTabs({ installed }: UseHomePowerupTabsParams): HomePowerupTab[] {
  const { t } = useTranslation();
  return useMemo<HomePowerupTab[]>(
    () =>
      POWERUPS.filter((entry) => installed.includes(entry.id)).map((entry) => ({
        key: entry.id as HomeSubTabKey,
        label: t(entry.nameKey),
        networks: entry.networks,
      })),
    [installed, t]
  );
}

export interface UseHomePowerupsCatalogParams {
  /** `useHomePowerupTabs`'s result — the arrangement sheet removes by these keys. */
  powerupTabs: readonly HomePowerupTab[];
  /** What this device has installed. */
  installed: readonly string[];
  install: (id: string) => void;
  developerNetworks: boolean;
  /** The network the screen stands on (`useHomeShell`'s `currentNetworkId`). */
  networkId: string;
}

export interface UseHomePowerupsCatalogResult {
  catalogVisible: boolean;
  handleCatalogToggle: () => void;
  handleCatalogClose: () => void;
  catalogEntries: PowerupsCatalogEntry[];
  /** Only a real Powerup can be installed — the mocks advertise nothing to open. */
  handleInstall: (id: string) => void;
  removableTabKeys: string[];
}

/** The catalogue drawer's own state, plus the entries it draws. */
export function useHomePowerupsCatalog({
  powerupTabs,
  installed,
  install,
  developerNetworks,
  networkId,
}: UseHomePowerupsCatalogParams): UseHomePowerupsCatalogResult {
  const [catalogVisible, setCatalogVisible] = useState(false);
  const handleCatalogToggle = useCallback(() => setCatalogVisible((open) => !open), []);
  const handleCatalogClose = useCallback(() => setCatalogVisible(false), []);

  const catalogEntries = useMemo(
    () =>
      getPowerupCatalog({ includeMocks: developerNetworks, networkId, installedIds: installed }),
    [developerNetworks, networkId, installed]
  );

  const handleInstall = useCallback(
    (id: string) => {
      if (POWERUPS.some((entry) => entry.id === id)) install(id);
    },
    [install]
  );

  const removableTabKeys = useMemo(
    () => powerupTabs.map((tab) => tab.key as string),
    [powerupTabs]
  );

  return {
    catalogVisible,
    handleCatalogToggle,
    handleCatalogClose,
    catalogEntries,
    handleInstall,
    removableTabKeys,
  };
}
