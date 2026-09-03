/**
 * @vitest-environment jsdom
 *
 * What matters here is not that an array round-trips but that the stored
 * order is never trusted blindly: a powerup uninstalled between launches must
 * not leave a phantom tab, and one installed between launches must appear
 * without the user's arrangement being discarded.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../storage', () => ({
  getStorage: vi.fn(),
  STORAGE_KEYS: { HOME_TABS_ORDER: 'salmon_home_tabs_order' },
}));

import * as storage from '../storage';
import { reconcileTabOrder, useHomeTabOrder } from './useHomeTabOrder';

const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getItem.mockResolvedValue(null);
  mockStorage.setItem.mockResolvedValue(undefined);
  vi.mocked(storage.getStorage).mockReturnValue(mockStorage as never);
});

describe('reconcileTabOrder', () => {
  it('keeps the user order when the offered keys have not changed', () => {
    expect(reconcileTabOrder(['nfts', 'portfolio'], ['portfolio', 'nfts'])).toEqual([
      'nfts',
      'portfolio',
    ]);
  });

  it('drops a stored key the app no longer offers', () => {
    expect(reconcileTabOrder(['stake', 'nfts', 'portfolio'], ['portfolio', 'nfts'])).toEqual([
      'nfts',
      'portfolio',
    ]);
  });

  it('appends a newly offered key in default order without disturbing the rest', () => {
    expect(reconcileTabOrder(['nfts', 'portfolio'], ['portfolio', 'nfts', 'stake'])).toEqual([
      'nfts',
      'portfolio',
      'stake',
    ]);
  });

  it('falls back to the default order when nothing is stored', () => {
    expect(reconcileTabOrder(null, ['portfolio', 'nfts'])).toEqual(['portfolio', 'nfts']);
  });

  it('renders a duplicated stored key once', () => {
    expect(reconcileTabOrder(['nfts', 'nfts', 'portfolio'], ['portfolio', 'nfts'])).toEqual([
      'nfts',
      'portfolio',
    ]);
  });
});

describe('useHomeTabOrder', () => {
  it('starts on the default order when storage is empty', async () => {
    const { result } = renderHook(() => useHomeTabOrder(['portfolio', 'nfts']));

    await waitFor(() => expect(mockStorage.getItem).toHaveBeenCalled());
    expect(result.current.order).toEqual(['portfolio', 'nfts']);
  });

  it('reads the stored order back, reconciled against what is offered', async () => {
    mockStorage.getItem.mockResolvedValue(['stake', 'nfts']);

    const { result } = renderHook(() => useHomeTabOrder(['portfolio', 'nfts']));

    await waitFor(() => expect(result.current.order).toEqual(['nfts', 'portfolio']));
  });

  it('persists a new order under the home tabs key', async () => {
    const { result } = renderHook(() => useHomeTabOrder(['portfolio', 'nfts']));
    await waitFor(() => expect(mockStorage.getItem).toHaveBeenCalled());

    act(() => {
      result.current.setOrder(['nfts', 'portfolio']);
    });

    expect(result.current.order).toEqual(['nfts', 'portfolio']);
    await waitFor(() =>
      expect(mockStorage.setItem).toHaveBeenCalledWith('salmon_home_tabs_order', [
        'nfts',
        'portfolio',
      ])
    );
  });

  it('keeps the default order when the read throws', async () => {
    mockStorage.getItem.mockRejectedValue(new Error('storage unavailable'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useHomeTabOrder(['portfolio', 'nfts']));

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(result.current.order).toEqual(['portfolio', 'nfts']);
    consoleError.mockRestore();
  });
});
