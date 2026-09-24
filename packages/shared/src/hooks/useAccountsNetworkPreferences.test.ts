/**
 * @vitest-environment jsdom
 * Trusted-app writes from useAccountsNetworkPreferences.
 *
 * In the extension every document (side panel, each approval popup) mounts its
 * own copy of this state, loaded once at unlock, over one shared storage area.
 * These tests model that: several hook instances seeded from the same snapshot,
 * writing to one in-memory store.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import { useAccountsNetworkPreferences } from './useAccountsNetworkPreferences';
import type { TrustedApps } from '../types/trusted-app';

const store = new Map<string, unknown>();

vi.mock('../storage', () => ({
  getStorageItem: vi.fn(async (key: string) => store.get(key) ?? null),
  setStorageItem: vi.fn(async (key: string, value: unknown) => {
    store.set(key, structuredClone(value));
  }),
  STORAGE_KEYS: {
    TRUSTED_APPS: 'salmon_trusted_apps',
    CUSTOM_TOKENS: 'salmon_custom_tokens',
  },
}));

const REVOKED = 'https://revoked.example';
const OTHER = 'https://other.example';
const UNRELATED = 'https://unrelated.example';

const stored = (): TrustedApps => store.get('salmon_trusted_apps') as TrustedApps;

/**
 * Mounts one document's copy of the preferences, seeded from `snapshot`. Each
 * document gets its own clone: separate documents share storage, not objects.
 */
function openDocument(snapshot: TrustedApps, networkId = 'solana-mainnet') {
  const own = structuredClone(snapshot);
  return renderHook(() => {
    const [trustedApps, setTrustedApps] = useState<TrustedApps>(own);
    const [tokens, setTokens] = useState({});
    return useAccountsNetworkPreferences({
      networkId,
      trustedApps,
      setTrustedApps,
      tokens,
      setTokens,
    });
  });
}

describe('useAccountsNetworkPreferences trusted apps', () => {
  beforeEach(() => {
    store.clear();
  });

  it('records the approved address with the grant', async () => {
    const doc = openDocument({});

    await act(() => doc.result.current.addTrustedApp(OTHER, { name: 'Other', address: 'Addr1' }));

    expect(stored()['solana-mainnet'][OTHER]).toEqual({
      name: 'Other',
      icon: undefined,
      address: 'Addr1',
    });
  });

  // The signing gate honours a grant on any network, so revoking on the
  // active network alone left a hidden grant that kept opening prompts.
  it('revokes a site on every network, not only the active one', async () => {
    const snapshot = {
      'solana-mainnet': { [REVOKED]: {} },
      'solana-devnet': { [REVOKED]: {}, [UNRELATED]: {} },
    };
    store.set('salmon_trusted_apps', snapshot);
    const doc = openDocument(snapshot);

    await act(() => doc.result.current.removeTrustedApp(REVOKED));

    expect(stored()).toEqual({
      'solana-mainnet': {},
      'solana-devnet': { [UNRELATED]: {} },
    });
    expect(snapshot['solana-devnet'][REVOKED]).toBeDefined();
  });

  // A popup unlocked before the side panel revoked a site still held the old
  // map, and its next write put the revoked site back.
  it('does not restore a site another document revoked', async () => {
    const snapshot = { 'solana-mainnet': { [REVOKED]: {}, [UNRELATED]: {} } };
    store.set('salmon_trusted_apps', snapshot);
    const sidePanel = openDocument(snapshot);
    const popup = openDocument(snapshot);
    const secondPanel = openDocument(snapshot);

    await act(() => sidePanel.result.current.removeTrustedApp(REVOKED));
    await act(() => popup.result.current.addTrustedApp(OTHER, { name: 'Other' }));
    expect(stored()['solana-mainnet'][REVOKED]).toBeUndefined();

    await act(() => secondPanel.result.current.removeTrustedApp(UNRELATED));
    expect(stored()['solana-mainnet']).toEqual({ [OTHER]: { name: 'Other' } });
  });
});
