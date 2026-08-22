/**
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

vi.mock('../api/services/exchangeRates', async () => {
  const actual = await vi.importActual<typeof import('../api/services/exchangeRates')>(
    '../api/services/exchangeRates'
  );

  return { ...actual, getExchangeRates: vi.fn() };
});

import { getExchangeRates, FALLBACK_RATES } from '../api/services/exchangeRates';
import { CurrencyProvider, useCurrencyContext } from './CurrencyContext';
import { AccountsContext, type AccountsContextValue } from './AccountsContext';
import {
  initStorage,
  resetStorage,
  createLocalStorageAdapter,
  isStorageInitialized,
} from '../storage';
import type { ExchangeRates } from '../types/currency';

const mockGetExchangeRates = vi.mocked(getExchangeRates);

const REAL_RATES = {
  base: 'usd',
  timestamp: 1710000000,
  rates: { usd: 1, eur: 0.92 },
} as unknown as ExchangeRates;

/** Minimal AccountsContext stand-in — only `ready` and `locked` are read here. */
function accountsValue(ready: boolean, locked: boolean): AccountsContextValue {
  return [{ ready, locked }, {}] as unknown as AccountsContextValue;
}

/**
 * Renders the provider under an accounts state the caller can advance
 * between renders, mirroring the real boot sequence: not-ready (where
 * `locked` is still false), then locked, then unlocked.
 */
function setup(initial: { ready: boolean; locked: boolean }) {
  let state = initial;
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AccountsContext.Provider value={accountsValue(state.ready, state.locked)}>
      <CurrencyProvider>{children}</CurrencyProvider>
    </AccountsContext.Provider>
  );
  Wrapper.displayName = 'CurrencyTestWrapper';
  const view = renderHook(() => useCurrencyContext(), { wrapper: Wrapper });

  return {
    ...view,
    advance: (next: { ready: boolean; locked: boolean }) => {
      state = next;
      view.rerender();
    },
  };
}

describe('CurrencyProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (!isStorageInitialized()) {
      initStorage({ platform: 'web', adapter: createLocalStorageAdapter() });
    }
  });

  afterEach(() => {
    resetStorage();
  });

  it('holds the rate fetch through boot and lock, and runs it on unlock', async () => {
    mockGetExchangeRates.mockResolvedValue(REAL_RATES);

    // Boot: accounts not ready yet, and `locked` is still false because the
    // vault has not been read. Nothing should leave the device here.
    const { result, advance } = setup({ ready: false, locked: false });
    expect(mockGetExchangeRates).not.toHaveBeenCalled();

    // Init finished and found an encrypted vault: the lock screen is up.
    advance({ ready: true, locked: true });
    expect(mockGetExchangeRates).not.toHaveBeenCalled();

    advance({ ready: true, locked: false });

    await waitFor(() => expect(result.current[0].rates).toEqual(REAL_RATES));
  });

  it('fetches exchange rates once the wallet is unlocked', async () => {
    mockGetExchangeRates.mockResolvedValue(REAL_RATES);

    const { result } = setup({ ready: true, locked: false });

    await waitFor(() => expect(result.current[0].rates).toEqual(REAL_RATES));
    expect(result.current[0].isFallback).toBe(false);
    expect(result.current[0].exchangeRate).toBe(1);
  });

  it('flags fallback rates so the UI can tell the user the amounts are not converted', async () => {
    mockGetExchangeRates.mockResolvedValue(FALLBACK_RATES);

    const { result } = setup({ ready: true, locked: false });

    await waitFor(() => expect(result.current[0].isFallback).toBe(true));
    expect(result.current[0].isLoading).toBe(false);
  });

  it('still surfaces an unexpected failure as a console error', async () => {
    // getExchangeRates handles network failures itself; anything that escapes
    // it is a real bug and must stay loud.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetExchangeRates.mockRejectedValue(new Error('unexpected'));

    const { result } = setup({ ready: true, locked: false });

    await waitFor(() => expect(result.current[0].isLoading).toBe(false));
    expect(errorSpy).toHaveBeenCalledWith(
      '[CurrencyContext] Failed to fetch exchange rates:',
      expect.any(Error)
    );

    errorSpy.mockRestore();
  });
});
