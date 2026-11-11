/**
 * Currency types and constants for multi-currency display support.
 *
 * All internal data remains in USD. Conversion happens at display time
 * using exchange rates fetched from the backend.
 *
 * @module types/currency
 */

// ============================================================================
// Supported Currencies
// ============================================================================

/**
 * Supported fiat currencies (lowercase codes matching CoinGecko format): the
 * ones the backend rates and CoinGecko also quotes market data in. US Dollar
 * and Euro first, the rest by name, which is the order the selector lists.
 */
export const SUPPORTED_CURRENCIES = [
  'usd',
  'eur',
  'ars',
  'aud',
  'bdt',
  'bhd',
  'bmd',
  'brl',
  'gbp',
  'cad',
  'clp',
  'cny',
  'czk',
  'dkk',
  'gel',
  'hkd',
  'huf',
  'inr',
  'idr',
  'ils',
  'jpy',
  'kwd',
  'myr',
  'mxn',
  'mmk',
  'twd',
  'nzd',
  'ngn',
  'nok',
  'pkr',
  'php',
  'pln',
  'rub',
  'sar',
  'sgd',
  'zar',
  'krw',
  'lkr',
  'sek',
  'chf',
  'thb',
  'try',
  'uah',
  'aed',
  'vnd',
] as const;

/**
 * Union type of supported currency codes
 */
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Default currency when none is configured
 */
export const DEFAULT_CURRENCY: CurrencyCode = 'usd';

// ============================================================================
// Currency Info
// ============================================================================

/**
 * Static info for a supported currency
 */
export interface CurrencyInfo {
  /** Lowercase currency code (e.g. 'usd') */
  code: CurrencyCode;
  /** Human-readable name (e.g. 'US Dollar') */
  name: string;
  /** Currency symbol (e.g. '$', '€', '¥') */
  symbol: string;
  /** Number of decimal places (0 for JPY/KRW, 3 for the Gulf dinars, 2 for most) */
  decimals: number;
  /** Where the symbol sits in its home country: `$5` or `5 Kč`. */
  position: 'before' | 'after';
  /** Whether a space separates symbol and number there: `CHF 5`, not `CHF5`. */
  spaced: boolean;
}

const before = { position: 'before', spaced: false } as const;
const beforeSpaced = { position: 'before', spaced: true } as const;
const after = { position: 'after', spaced: false } as const;
const afterSpaced = { position: 'after', spaced: true } as const;

/**
 * Static lookup map for all supported currencies.
 *
 * Position, spacing and decimals follow the currency's home country (Unicode
 * CLDR), so a Czech user reads `1,234.50 Kč`. Separators follow the app
 * language instead. Three departures, all so a symbol reads unambiguously
 * next to US Dollars in one list: every dollar or peso other than USD carries
 * its country prefix (AR$, C$, NZ$…), the yuan is CN¥ beside the yen, and the
 * currencies whose home symbol is in Arabic or Sinhala script show their code,
 * which a left-to-right line of digits cannot reorder.
 */
export const CURRENCY_MAP: Record<CurrencyCode, CurrencyInfo> = {
  usd: { code: 'usd', name: 'US Dollar', symbol: '$', decimals: 2, ...before },
  eur: { code: 'eur', name: 'Euro', symbol: '€', decimals: 2, ...before },
  ars: { code: 'ars', name: 'Argentine Peso', symbol: 'AR$', decimals: 2, ...before },
  aud: { code: 'aud', name: 'Australian Dollar', symbol: 'A$', decimals: 2, ...before },
  bdt: { code: 'bdt', name: 'Bangladeshi Taka', symbol: '৳', decimals: 2, ...after },
  bhd: { code: 'bhd', name: 'Bahraini Dinar', symbol: 'BHD', decimals: 3, ...beforeSpaced },
  bmd: { code: 'bmd', name: 'Bermudian Dollar', symbol: 'BD$', decimals: 2, ...before },
  brl: { code: 'brl', name: 'Brazilian Real', symbol: 'R$', decimals: 2, ...beforeSpaced },
  gbp: { code: 'gbp', name: 'British Pound', symbol: '£', decimals: 2, ...before },
  cad: { code: 'cad', name: 'Canadian Dollar', symbol: 'C$', decimals: 2, ...before },
  clp: { code: 'clp', name: 'Chilean Peso', symbol: 'CL$', decimals: 0, ...before },
  cny: { code: 'cny', name: 'Chinese Yuan', symbol: 'CN¥', decimals: 2, ...before },
  czk: { code: 'czk', name: 'Czech Koruna', symbol: 'Kč', decimals: 2, ...afterSpaced },
  dkk: { code: 'dkk', name: 'Danish Krone', symbol: 'kr.', decimals: 2, ...afterSpaced },
  gel: { code: 'gel', name: 'Georgian Lari', symbol: '₾', decimals: 2, ...afterSpaced },
  hkd: { code: 'hkd', name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2, ...before },
  huf: { code: 'huf', name: 'Hungarian Forint', symbol: 'Ft', decimals: 0, ...afterSpaced },
  inr: { code: 'inr', name: 'Indian Rupee', symbol: '₹', decimals: 2, ...before },
  idr: { code: 'idr', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 0, ...beforeSpaced },
  ils: { code: 'ils', name: 'Israeli New Shekel', symbol: '₪', decimals: 2, ...afterSpaced },
  jpy: { code: 'jpy', name: 'Japanese Yen', symbol: '¥', decimals: 0, ...before },
  kwd: { code: 'kwd', name: 'Kuwaiti Dinar', symbol: 'KWD', decimals: 3, ...beforeSpaced },
  myr: { code: 'myr', name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2, ...beforeSpaced },
  mxn: { code: 'mxn', name: 'Mexican Peso', symbol: 'MX$', decimals: 2, ...before },
  mmk: { code: 'mmk', name: 'Myanmar Kyat', symbol: 'K', decimals: 0, ...afterSpaced },
  twd: { code: 'twd', name: 'New Taiwan Dollar', symbol: 'NT$', decimals: 2, ...before },
  nzd: { code: 'nzd', name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2, ...before },
  ngn: { code: 'ngn', name: 'Nigerian Naira', symbol: '₦', decimals: 2, ...before },
  nok: { code: 'nok', name: 'Norwegian Krone', symbol: 'kr', decimals: 2, ...afterSpaced },
  pkr: { code: 'pkr', name: 'Pakistani Rupee', symbol: 'Rs', decimals: 0, ...beforeSpaced },
  php: { code: 'php', name: 'Philippine Peso', symbol: '₱', decimals: 2, ...before },
  pln: { code: 'pln', name: 'Polish Zloty', symbol: 'zł', decimals: 2, ...afterSpaced },
  rub: { code: 'rub', name: 'Russian Ruble', symbol: '₽', decimals: 2, ...afterSpaced },
  sar: { code: 'sar', name: 'Saudi Riyal', symbol: 'SAR', decimals: 2, ...beforeSpaced },
  sgd: { code: 'sgd', name: 'Singapore Dollar', symbol: 'S$', decimals: 2, ...before },
  zar: { code: 'zar', name: 'South African Rand', symbol: 'R', decimals: 2, ...beforeSpaced },
  krw: { code: 'krw', name: 'South Korean Won', symbol: '₩', decimals: 0, ...before },
  lkr: { code: 'lkr', name: 'Sri Lankan Rupee', symbol: 'LKR', decimals: 2, ...beforeSpaced },
  sek: { code: 'sek', name: 'Swedish Krona', symbol: 'kr', decimals: 2, ...afterSpaced },
  chf: { code: 'chf', name: 'Swiss Franc', symbol: 'CHF', decimals: 2, ...beforeSpaced },
  thb: { code: 'thb', name: 'Thai Baht', symbol: '฿', decimals: 2, ...before },
  try: { code: 'try', name: 'Turkish Lira', symbol: '₺', decimals: 2, ...before },
  uah: { code: 'uah', name: 'Ukrainian Hryvnia', symbol: '₴', decimals: 2, ...afterSpaced },
  aed: { code: 'aed', name: 'UAE Dirham', symbol: 'AED', decimals: 2, ...beforeSpaced },
  vnd: { code: 'vnd', name: 'Vietnamese Dong', symbol: '₫', decimals: 0, ...afterSpaced },
};

// ============================================================================
// Exchange Rates
// ============================================================================

/**
 * Exchange rates response from the backend
 */
export interface ExchangeRates {
  /** Base currency (always 'usd') */
  base: 'usd';
  /** Unix timestamp of when rates were fetched */
  timestamp: number;
  /** Rate for each currency (usd is always 1) */
  rates: Record<CurrencyCode, number>;
}
