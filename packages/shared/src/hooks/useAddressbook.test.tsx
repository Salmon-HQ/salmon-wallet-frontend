/**
 * @vitest-environment jsdom
 * Tests for useAddressbook — load/reload and the classified write path.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../analytics', () => ({
  trackEvent: vi.fn(),
}));

import { useAddressbook, AddressbookError } from './useAddressbook';
import {
  initStorage,
  resetStorage,
  isStorageInitialized,
  createLocalStorageAdapter,
  getStorageItem,
  setStorageItem,
  STORAGE_KEYS,
} from '../storage';
import type { NetworkAdapter, StoredAddress, AddressBookNetwork } from '../types/address';

const SOLANA_NETWORK = { id: 'solana-mainnet', name: 'Solana' } as unknown as AddressBookNetwork;

function makeAdapter(
  getNetwork: NetworkAdapter['getNetwork'] = async () => SOLANA_NETWORK
): NetworkAdapter {
  return { getNetwork, getNetworks: async () => [SOLANA_NETWORK] };
}

const CONTACT_INPUT = { address: 'addr-1', name: 'Alice', networkId: 'solana-mainnet' };
const STORED: StoredAddress = { address: 'addr-0', name: 'Bob', networkId: 'solana-mainnet' };

describe('useAddressbook', () => {
  beforeEach(() => {
    initStorage({ platform: 'extension', adapter: createLocalStorageAdapter() });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (isStorageInitialized()) resetStorage();
    window.localStorage.clear();
  });

  it('loads stored contacts on mount', async () => {
    await setStorageItem(STORAGE_KEYS.CONTACTS, [STORED]);

    const adapter = makeAdapter();
    const { result } = renderHook(() => useAddressbook({ networkAdapter: adapter }));

    await waitFor(() => expect(result.current[0].isLoading).toBe(false));
    expect(result.current[0].contacts).toHaveLength(1);
    expect(result.current[0].contacts[0].name).toBe('Bob');
  });

  it('reload re-runs the load effect and clears the error', async () => {
    const getNetwork = vi
      .fn<NetworkAdapter['getNetwork']>()
      .mockRejectedValueOnce(new Error('adapter down'))
      .mockResolvedValue(SOLANA_NETWORK);
    await setStorageItem(STORAGE_KEYS.CONTACTS, [STORED]);

    const adapter = makeAdapter(getNetwork);
    const { result } = renderHook(() => useAddressbook({ networkAdapter: adapter }));

    await waitFor(() => expect(result.current[0].isLoading).toBe(false));
    expect(result.current[0].isError).toBe(true);
    expect(result.current[0].contacts).toHaveLength(0);

    act(() => {
      result.current[1].reload();
    });

    await waitFor(() => expect(result.current[0].contacts).toHaveLength(1));
    expect(result.current[0].isError).toBe(false);
  });

  it('adds a contact and persists it', async () => {
    const adapter = makeAdapter();
    const { result } = renderHook(() => useAddressbook({ networkAdapter: adapter }));
    await waitFor(() => expect(result.current[0].isLoading).toBe(false));

    await act(async () => {
      await result.current[1].addContact(CONTACT_INPUT);
    });

    expect(result.current[0].contacts.map((c) => c.name)).toEqual(['Alice']);
    const stored = await getStorageItem<StoredAddress[]>(STORAGE_KEYS.CONTACTS);
    expect(stored).toHaveLength(1);
  });

  it('throws a persist-classified error and leaves state untouched when storage fails', async () => {
    const adapter = makeAdapter();
    const { result } = renderHook(() => useAddressbook({ networkAdapter: adapter }));
    await waitFor(() => expect(result.current[0].isLoading).toBe(false));

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('disk full');
    });

    await act(async () => {
      await expect(result.current[1].addContact(CONTACT_INPUT)).rejects.toMatchObject({
        name: 'AddressbookError',
        kind: 'persist',
      });
    });
    setItemSpy.mockRestore();

    expect(result.current[0].contacts).toHaveLength(0);
    expect(await getStorageItem<StoredAddress[]>(STORAGE_KEYS.CONTACTS)).toBeNull();
  });

  it('keeps the persisted contacts in state when resolution fails after a successful write', async () => {
    // Initial load has an empty book, so the adapter's first call is the
    // resolve-after-write — make that one fail, then recover.
    const getNetwork = vi
      .fn<NetworkAdapter['getNetwork']>()
      .mockRejectedValueOnce(new Error('adapter down'))
      .mockResolvedValue(SOLANA_NETWORK);

    const adapter = makeAdapter(getNetwork);
    const { result } = renderHook(() => useAddressbook({ networkAdapter: adapter }));
    await waitFor(() => expect(result.current[0].isLoading).toBe(false));

    let thrown: unknown = null;
    await act(async () => {
      try {
        await result.current[1].addContact(CONTACT_INPUT);
      } catch (err) {
        thrown = err;
      }
    });

    expect(thrown).toBeInstanceOf(AddressbookError);
    expect((thrown as AddressbookError).kind).toBe('resolve');
    // The write reached storage even though resolution failed.
    expect(await getStorageItem<StoredAddress[]>(STORAGE_KEYS.CONTACTS)).toHaveLength(1);

    // State reflects the persisted list: a follow-up edit builds on it instead
    // of dropping the saved contact.
    await act(async () => {
      await result.current[1].addContact({ ...CONTACT_INPUT, address: 'addr-2', name: 'Carol' });
    });
    expect(result.current[0].contacts.map((c) => c.name).sort()).toEqual(['Alice', 'Carol']);
    expect(await getStorageItem<StoredAddress[]>(STORAGE_KEYS.CONTACTS)).toHaveLength(2);
  });
});
