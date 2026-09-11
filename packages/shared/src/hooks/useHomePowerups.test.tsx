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
import { getPowerupCatalog } from '../powerups/catalog';
import { POWERUPS } from '../powerups/registry';

describe('useHomePowerupTabs', () => {
  it('carries nothing installed', () => {
    const { result } = renderHook(() => useHomePowerupTabs({ installed: [], powerups: POWERUPS }));
    expect(result.current).toEqual([]);
  });

  it('turns an installed id into a Home tab, labelled and networked', () => {
    const { result } = renderHook(() =>
      useHomePowerupTabs({ installed: ['swap'], powerups: POWERUPS })
    );
    expect(result.current).toEqual([
      { key: 'swap', label: 'swap.catalog.name', networks: ['solana-mainnet'] },
    ]);
  });

  it('ignores an installed id the registry does not carry', () => {
    const { result } = renderHook(() =>
      useHomePowerupTabs({ installed: ['not-a-powerup'], powerups: POWERUPS })
    );
    expect(result.current).toEqual([]);
  });
});

describe('useHomePowerupsCatalog', () => {
  function setup(installed: string[] = []) {
    const install = vi.fn();
    const hook = renderHook(
      (props: { installed: string[]; networkId: string; developerNetworks: boolean }) =>
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
        }),
      { initialProps: 'solana-mainnet' }
    );
    expect(result.current.catalogEntries.map((entry) => entry.id)).toEqual(['swap']);

    rerender('bitcoin-mainnet');
    expect(result.current.catalogEntries).toEqual([]);
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
