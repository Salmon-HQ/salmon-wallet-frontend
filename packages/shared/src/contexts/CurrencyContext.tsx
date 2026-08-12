/**
 * CurrencyContext - Shared state context for multi-currency display
 *
 * Manages the user's preferred display currency, exchange rates, and
 * provides pre-bound formatting functions so consumers don't need to
 * pass currency/rate on every call.
 *
 * Follows the same [state, actions] tuple pattern as AccountsContext.
 *
 * @module contexts/CurrencyContext
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

import {
  SUPPORTED_CURRENCIES,
  CURRENCY_MAP,
  DEFAULT_CURRENCY,
  type CurrencyCode,
  type CurrencyInfo,
  type ExchangeRates,
} from '../types/currency';
import { getExchangeRates } from '../api/services/exchangeRates';
import { getStorage, STORAGE_KEYS } from '../storage';
import {
  formatFiatValue,
  formatFiatLarge,
  formatFiatChange,
  formatFiatPrecise,
  getCurrencySymbol,
} from '../utils/currencyFormatting';

// ============================================================================
// Types
// ============================================================================

export interface CurrencyState {
  /** Current currency code (e.g. 'eur') */
  currency: CurrencyCode;
  /** Static info for the current currency */
  currencyInfo: CurrencyInfo;
  /** Exchange rate for the current currency (1 for usd) */
  exchangeRate: number;
  /** All exchange rates */
  rates: ExchangeRates | null;
  /** Whether rates are being loaded */
  isLoading: boolean;
}

export interface CurrencyActions {
  /** Change the display currency (persists to storage) */
  changeCurrency: (code: CurrencyCode) => Promise<void>;
  /** Convert a USD amount to the current currency */
  convert: (usdAmount: number) => number;
  /** Format a USD amount as a fiat value with symbol (replaces showAmount) */
  formatValue: (usdAmount: number | null | undefined) => string;
  /** Format a USD amount as a large-number string (replaces formatUSD) */
  formatLarge: (usdAmount: number | null | undefined) => string;
  /** Format an absolute change with sign and symbol (replaces showAbsoluteChange) */
  formatChange: (usdAmount: number | null | undefined) => string | null;
  /** Format with high precision, no symbol (replaces formatUsdPrecise) */
  formatPrecise: (usdAmount: number | null | undefined, dec?: number) => string;
  /** Currency symbol for the current currency */
  symbol: string;
  /** Force refresh exchange rates */
  refreshRates: () => Promise<void>;
}

type CurrencyContextValue = [CurrencyState, CurrencyActions];

// ============================================================================
// Context
// ============================================================================

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

// ============================================================================
// Constants
// ============================================================================

const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

// ============================================================================
// Provider
// ============================================================================

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived values
  const exchangeRate = rates?.rates?.[currency] ?? 1;
  const currencyInfo = CURRENCY_MAP[currency];

  // --------------------------------------------------
  // Load saved currency from storage
  // --------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const storage = getStorage();
        const saved = await storage.getItem<string>(STORAGE_KEYS.CURRENCY);
        if (saved) {
          const normalized = saved.toLowerCase() as CurrencyCode;
          if (SUPPORTED_CURRENCIES.includes(normalized)) {
            setCurrency(normalized);
          }
        }
      } catch (error) {
        console.error('[CurrencyContext] Failed to load saved currency:', error);
      }
    })();
  }, []);

  // --------------------------------------------------
  // Fetch exchange rates on mount + interval
  // --------------------------------------------------
  const fetchRates = useCallback(async () => {
    try {
      const data = await getExchangeRates();
      setRates(data);
    } catch (error) {
      console.error('[CurrencyContext] Failed to fetch exchange rates:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();

    intervalRef.current = setInterval(fetchRates, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchRates]);

  // --------------------------------------------------
  // Actions
  // --------------------------------------------------
  const changeCurrency = useCallback(async (code: CurrencyCode) => {
    setCurrency(code);
    try {
      const storage = getStorage();
      await storage.setItem(STORAGE_KEYS.CURRENCY, code);
    } catch (error) {
      console.error('[CurrencyContext] Failed to persist currency:', error);
    }
  }, []);

  const convert = useCallback((usdAmount: number) => usdAmount * exchangeRate, [exchangeRate]);

  const formatValue = useCallback(
    (usdAmount: number | null | undefined) => formatFiatValue(usdAmount, currency, exchangeRate),
    [currency, exchangeRate]
  );

  const formatLarge = useCallback(
    (usdAmount: number | null | undefined) => formatFiatLarge(usdAmount, currency, exchangeRate),
    [currency, exchangeRate]
  );

  const formatChange = useCallback(
    (usdAmount: number | null | undefined) => formatFiatChange(usdAmount, currency, exchangeRate),
    [currency, exchangeRate]
  );

  const formatPrecise = useCallback(
    (usdAmount: number | null | undefined, dec?: number) =>
      formatFiatPrecise(usdAmount, currency, exchangeRate, dec),
    [currency, exchangeRate]
  );

  const symbol = getCurrencySymbol(currency);

  const refreshRates = useCallback(async () => {
    setIsLoading(true);
    await fetchRates();
  }, [fetchRates]);

  // --------------------------------------------------
  // Memoized context value
  // --------------------------------------------------
  const value = useMemo<CurrencyContextValue>(
    () => [
      { currency, currencyInfo, exchangeRate, rates, isLoading },
      {
        changeCurrency,
        convert,
        formatValue,
        formatLarge,
        formatChange,
        formatPrecise,
        symbol,
        refreshRates,
      },
    ],
    [
      currency,
      currencyInfo,
      exchangeRate,
      rates,
      isLoading,
      changeCurrency,
      convert,
      formatValue,
      formatLarge,
      formatChange,
      formatPrecise,
      symbol,
      refreshRates,
    ]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Access shared currency state and actions from context.
 *
 * @throws Error if used outside of CurrencyProvider
 *
 * @example
 * ```tsx
 * const [{ currency }, { formatValue, formatLarge }] = useCurrencyContext();
 * return <Text>{formatValue(usdPrice)}</Text>;
 * ```
 */
export function useCurrencyContext(): CurrencyContextValue {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error(
      'useCurrencyContext must be used within a CurrencyProvider. ' +
        'Make sure to wrap your app with <CurrencyProvider>.'
    );
  }

  return context;
}

// ============================================================================
// Exports
// ============================================================================

export { CurrencyContext };
export type { CurrencyContextValue, CurrencyProviderProps };
