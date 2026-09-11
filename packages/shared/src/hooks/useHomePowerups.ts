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

// Types only: the registry and the catalogue reach these hooks as PARAMETERS,
// handed in by each Home from its platform's Powerups entry (the module the
// build flag aliases to its `.off` twin). Importing them here by value would
// carry every Powerup's copy into a build with Powerups off (spec 027 §3).
import type { PowerupCatalogParams } from '../powerups/catalog';
import type { PowerupEntry } from '../powerups/registry';
import type { PowerupsCatalogEntry } from '../types/ui/index';
import type { PowerupAllowlist } from '../utils/powerupSwitches';
import type { HomePowerupTab, HomeSubTabKey } from './useHomeShell';

export interface UseHomePowerupTabsParams {
  /** What this device has installed. */
  installed: readonly string[];
  /** The registry, from the platform's Powerups entry (empty with Powerups off). */
  powerups: readonly PowerupEntry[];
  /**
   * The backend's kill switch for the network the screen stands on
   * (`useNetworkPowerups`). An installed Powerup it does not list is not
   * offered; one it lists as disabled keeps its tab and shows the reason.
   */
  allowlist: PowerupAllowlist;
}

/** The installed Powerups, as Home surfaces — `useHomeShell`'s `powerupTabs` input. */
export function useHomePowerupTabs({
  installed,
  powerups,
  allowlist,
}: UseHomePowerupTabsParams): HomePowerupTab[] {
  const { t } = useTranslation();
  return useMemo<HomePowerupTab[]>(
    () =>
      powerups
        .filter(
          (entry) =>
            installed.includes(entry.id) &&
            (allowlist.enabled.includes(entry.id) || entry.id in allowlist.disabled)
        )
        .map((entry) => ({
          key: entry.id as HomeSubTabKey,
          label: t(entry.nameKey),
          networks: entry.networks,
          disabledReason: allowlist.disabled[entry.id],
        })),
    [installed, powerups, allowlist, t]
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
  /** The registry, from the platform's Powerups entry (empty with Powerups off). */
  powerups: readonly PowerupEntry[];
  /** The catalogue builder, from the same entry (returns nothing with Powerups off). */
  getCatalog: (params: PowerupCatalogParams) => PowerupsCatalogEntry[];
  /** The backend's kill switch for `networkId`; only its enabled ids are offered. */
  allowlist: PowerupAllowlist;
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
  powerups,
  getCatalog,
  allowlist,
}: UseHomePowerupsCatalogParams): UseHomePowerupsCatalogResult {
  const [catalogVisible, setCatalogVisible] = useState(false);
  const handleCatalogToggle = useCallback(() => setCatalogVisible((open) => !open), []);
  const handleCatalogClose = useCallback(() => setCatalogVisible(false), []);

  const catalogEntries = useMemo(
    () =>
      getCatalog({
        includeMocks: developerNetworks,
        networkId,
        installedIds: installed,
        allowedIds: allowlist.enabled,
      }),
    [getCatalog, developerNetworks, networkId, installed, allowlist]
  );

  const handleInstall = useCallback(
    (id: string) => {
      if (powerups.some((entry) => entry.id === id) && allowlist.enabled.includes(id)) install(id);
    },
    [install, powerups, allowlist]
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
