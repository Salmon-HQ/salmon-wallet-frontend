/**
 * The converted line under an amount card — `≈ 12.50 USD` — in the user's
 * display currency. One derivation for Send's amount step and every Powerup
 * that asks for an amount (docs/POWERUPS-UI.md §1.3).
 */
import { useMemo } from 'react';

import { useCurrencyContext } from '../contexts/CurrencyContext';

export function useFiatLine(amount: string, price: number | undefined): string {
  const [{ currency }, { formatPrecise }] = useCurrencyContext();
  return useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    const fiat = !price || numAmount === 0 ? 0 : numAmount * price;
    return `≈ ${formatPrecise(fiat)} ${currency.toUpperCase()}`;
  }, [amount, price, formatPrecise, currency]);
}
