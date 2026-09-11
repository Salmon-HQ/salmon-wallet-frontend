/**
 * @vitest-environment jsdom
 *
 * The Powerups slice of Home, held once for both platforms: which installed
 * ids become `useHomeShell` sub-tabs, and the catalogue drawer's own state
 * plus its entries. Exercised against the real shared registry (one entry,
 * `swap`) rather than a mock — the whole point is that both Homes read the
 * same one.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

import { useHomePowerupTabs, useHomePowerupsCatalog } from './useHomePowerups';
import { EMPTY_POWERUP_ALLOWLIST, type PowerupAllowlist } from '../utils/powerupSwitches';

const SWAP_ON: PowerupAllowlist = { enabled: ['swap'], disabled: {} };
import { getPowerupCatalog } from '../powerups/catalog';
import { POWERUPS } from '../powerups/registry';

describe('useHomePowerupTabs', () => {
  it('carries nothing installed', () => {
    const { result } = renderHook(() =>
      useHomePowerupTabs({ installed: [], powerups: POWERUPS, allowlist: SWAP_ON })
    );
    expect(result.current).toEqual([]);
  });

  it('turns an installed id into a Home tab, labelled and networked', () => {
    const { result } = renderHook(() =>
      useHomePowerupTabs({ installed: ['swap'], powerups: POWERUPS, allowlist: SWAP_ON })
    );
    expect(result.current).toEqual([
      { key: 'swap', label: 'swap.catalog.name', networks: ['solana-mainnet'] },
    ]);
  });

  it('withholds an installed Powerup the backend does not list — fail closed', () => {
    const { result } = renderHook(() =>
      useHomePowerupTabs({
        installed: ['swap'],
        powerups: POWERUPS,
        allowlist: EMPTY_POWERUP_ALLOWLIST,
      })
    );
    expect(result.current).toEqual([]);
  });

  it('keeps the tab of a switched-off Powerup and carries its reason', () => {
    const { result } = renderHook(() =>
      useHomePowerupTabs({
        installed: ['swap'],
        powerups: POWERUPS,
        allowlist: { enabled: [], disabled: { swap: 'maintenance' } },
      })
    );
    expect(result.current).toHaveLength(1);
    expect(result.current[0].disabledReason).toBe('maintenance');
  });

  it('ignores an installed id the registry does not carry', () => {
    const { result } = renderHook(() =>
      useHomePowerupTabs({ installed: ['not-a-powerup'], powerups: POWERUPS, allowlist: SWAP_ON })
    );
    expect(result.current).toEqual([]);
  });
});

describe('useHomePowerupsCatalog', () => {
  function setup(installed: string[] = []) {
    const install = vi.fn();
    const hook = renderHook(
      (props: {
        installed: string[];
        networkId: string;
        developerNetworks: boolean;
        allowlist?: PowerupAllowlist;
      }) =>
        useHomePowerupsCatalog({
          powerupTabs: props.installed.includes('swap')
            ? [{ key: 'swap', label: 'Swap', networks: ['solana-mainnet'] }]
            : [],
          installed: props.installed,
          install,
          developerNetworks: props.developerNetworks,
          networkId: props.networkId,
          powerups: POWERUPS,
          getCatalog: getPowerupCatalog,
          allowlist: props.allowlist ?? SWAP_ON,
        }),
      { initialProps: { installed, networkId: 'solana-mainnet', developerNetworks: false } }
    );
    return { ...hook, install };
  }

  it('starts closed', () => {
    const { result } = setup();
    expect(result.current.catalogVisible).toBe(false);
  });

  it('toggles and closes the drawer', () => {
    const { result } = setup();
    act(() => result.current.handleCatalogToggle());
    expect(result.current.catalogVisible).toBe(true);
    act(() => result.current.handleCatalogClose());
    expect(result.current.catalogVisible).toBe(false);
  });

  it('offers the real entry on its network, unlisted elsewhere', () => {
    const { result, rerender } = renderHook(
      (networkId: string) =>
        useHomePowerupsCatalog({
          powerupTabs: [],
          installed: [],
          install: vi.fn(),
          developerNetworks: false,
          networkId,
          powerups: POWERUPS,
          getCatalog: getPowerupCatalog,
          allowlist: SWAP_ON,
        }),
      { initialProps: 'solana-mainnet' }
    );
    expect(result.current.catalogEntries.map((entry) => entry.id)).toEqual(['swap']);

    rerender('bitcoin-mainnet');
    expect(result.current.catalogEntries).toEqual([]);
  });

  it('withholds a Powerup the backend does not list, and refuses to install it', () => {
    const { result, install } = setup([]);
    act(() => result.current.handleInstall('swap'));
    expect(install).toHaveBeenCalledWith('swap');

    const closed = renderHook(() =>
      useHomePowerupsCatalog({
        powerupTabs: [],
        installed: [],
        install,
        developerNetworks: false,
        networkId: 'solana-mainnet',
        powerups: POWERUPS,
        getCatalog: getPowerupCatalog,
        allowlist: EMPTY_POWERUP_ALLOWLIST,
      })
    );
    expect(closed.result.current.catalogEntries).toEqual([]);
    install.mockClear();
    act(() => closed.result.current.handleInstall('swap'));
    expect(install).not.toHaveBeenCalled();
  });

  it('keeps an installed, switched-off Powerup listed with its reason', () => {
    const { result } = renderHook(() =>
      useHomePowerupsCatalog({
        powerupTabs: [],
        installed: ['swap'],
        install: vi.fn(),
        developerNetworks: false,
        networkId: 'solana-mainnet',
        powerups: POWERUPS,
        getCatalog: getPowerupCatalog,
        allowlist: { enabled: [], disabled: { swap: 'maintenance' } },
      })
    );
    const swap = result.current.catalogEntries.find((entry) => entry.id === 'swap');
    expect(swap?.installed).toBe(true);
    expect(swap?.disabledReason).toBe('maintenance');
  });

  it('installs only a real Powerup id', () => {
    const { result, install } = setup();
    act(() => result.current.handleInstall('swap'));
    expect(install).toHaveBeenCalledWith('swap');

    install.mockClear();
    act(() => result.current.handleInstall('not-a-powerup'));
    expect(install).not.toHaveBeenCalled();
  });

  it('lists installed tabs as removable', () => {
    const { result } = setup(['swap']);
    expect(result.current.removableTabKeys).toEqual(['swap']);
  });
});
